mod firestore_watch_toggle;
mod serial_client;

use anyhow::Result;
use dotenvy::dotenv;
use firestore_watch_toggle::{emit_commands, DesiredState, FirestoreConfig, FirestoreWatchToggle};
use serde_json::Value;
use serial_client::GatewayConnection;
use std::env;
use std::fs;
use std::path::{Path, PathBuf};
use std::time::Duration;
use tokio::sync::mpsc;
use tokio::time::interval;

#[derive(Clone, Debug)]
struct Config {
    serial_port: String,
    serial_baud: u32,
    control_file: PathBuf,
    state_file: PathBuf,
    control_poll_ms: u64,
    firestore: Option<FirestoreConfig>,
}

fn load_config() -> Result<Config> {
    let _ = dotenv();
    if Path::new("config/.env").exists() {
        let _ = dotenvy::from_filename("config/.env");
    }

    let serial_port = env::var("SERIAL_PORT").unwrap_or_else(|_| "/dev/ttyUSB0".to_string());
    let serial_baud = env::var("SERIAL_BAUD")
        .ok()
        .and_then(|v| v.parse::<u32>().ok())
        .unwrap_or(9600);

    let control_file = PathBuf::from(
        env::var("CONTROL_FILE").unwrap_or_else(|_| "runtime/control.json".to_string()),
    );
    let state_file = PathBuf::from(
        env::var("STATE_FILE").unwrap_or_else(|_| "runtime/last_state.json".to_string()),
    );
    let control_poll_ms = env::var("CONTROL_POLL_MS")
        .ok()
        .and_then(|v| v.parse::<u64>().ok())
        .unwrap_or(250);

    let firestore = match (
        env::var("PROJECT_ID").ok(),
        env::var("WATCH_DOC").ok(),
        env::var("SERVICE_ACCOUNT_PATH").ok(),
    ) {
        (Some(project_id), Some(watch_doc), Some(service_account_path)) => Some(FirestoreConfig {
            project_id,
            service_account_path: if Path::new(&service_account_path).is_absolute() {
                service_account_path
            } else {
                std::env::current_dir()?
                    .join(service_account_path)
                    .to_string_lossy()
                    .to_string()
            },
            watch_doc,
            music_collection: env::var("MUSIC_COLLECTION").unwrap_or_else(|_| "music".to_string()),
            poll_ms: env::var("FIRESTORE_POLL_MS")
                .ok()
                .and_then(|v| v.parse::<u64>().ok())
                .unwrap_or(700),
        }),
        _ => None,
    };

    Ok(Config {
        serial_port,
        serial_baud,
        control_file,
        state_file,
        control_poll_ms,
        firestore,
    })
}

fn desired_from_file(path: &Path) -> Result<Option<DesiredState>> {
    if !path.exists() {
        return Ok(None);
    }

    let content = fs::read_to_string(path)?;
    let json: Value = serde_json::from_str(&content)?;

    let desired = DesiredState {
        fan: json
            .get("fan")
            .and_then(|v| serde_json::from_value(v.clone()).ok()),
        fan_ina: json
            .get("fan_INA")
            .and_then(|v| serde_json::from_value(v.clone()).ok()),
        fan_inb: json
            .get("fan_INB")
            .and_then(|v| serde_json::from_value(v.clone()).ok()),
        door: json
            .get("door")
            .and_then(|v| serde_json::from_value(v.clone()).ok()),
        window: json
            .get("window")
            .and_then(|v| serde_json::from_value(v.clone()).ok()),
        buzzer: json
            .get("buzzer")
            .and_then(|v| serde_json::from_value(v.clone()).ok()),
        music: json
            .get("music")
            .and_then(|v| serde_json::from_value(v.clone()).ok()),
        white_light: json
            .get("white_light")
            .and_then(|v| serde_json::from_value(v.clone()).ok()),
        orange_light: json
            .get("orange_light")
            .and_then(|v| serde_json::from_value(v.clone()).ok()),
        led_text_display: json
            .get("ledTextDisplay")
            .and_then(|v| v.as_str().map(|s| s.to_string())),
    };

    Ok(Some(desired))
}

async fn control_poll_task(
    control_file: PathBuf,
    poll_ms: u64,
    tx: mpsc::Sender<String>,
) -> Result<()> {
    let mut ticker = interval(Duration::from_millis(poll_ms.max(100)));
    let mut previous = DesiredState::default();
    let mut initialized = false;

    loop {
        ticker.tick().await;

        let Some(next) = desired_from_file(&control_file)? else {
            continue;
        };

        if !initialized {
            previous = next;
            initialized = true;
            continue;
        }

        let commands = emit_commands(&mut previous, &next);
        for cmd in commands {
            if tx.send(cmd).await.is_err() {
                return Ok(());
            }
        }
    }
}

#[tokio::main]
async fn main() -> Result<()> {
    let _ = rustls::crypto::ring::default_provider().install_default();

    let config = load_config()?;

    println!("Rust Gateway starting");
    println!("Serial: {} @ {}", config.serial_port, config.serial_baud);
    println!("Control file: {}", config.control_file.display());
    println!("State file: {}", config.state_file.display());

    let connection = serial_client::open_connection(&config.serial_port, config.serial_baud).await?;

    let (cmd_tx, cmd_rx) = mpsc::channel::<String>(256);
    let (telemetry_tx, telemetry_rx) = mpsc::channel(256);

    let reader_state_file = config.state_file.clone();
    let (reader_task, writer_task) = match connection {
        GatewayConnection::Serial(stream) => {
            let (reader, writer) = tokio::io::split(stream);
            let reader_task = tokio::spawn(async move {
                serial_client::serial_reader_task(reader, reader_state_file, telemetry_tx).await
            });
            let writer_task = tokio::spawn(async move { serial_client::serial_writer_task(writer, cmd_rx).await });
            (reader_task, writer_task)
        }
        GatewayConnection::Tcp(stream) => {
            let (reader, writer) = stream.into_split();
            let reader_task = tokio::spawn(async move {
                serial_client::serial_reader_task(reader, reader_state_file, telemetry_tx).await
            });
            let writer_task = tokio::spawn(async move { serial_client::serial_writer_task(writer, cmd_rx).await });
            (reader_task, writer_task)
        }
    };

    let control_task = if let Some(fire_cfg) = config.firestore.clone() {
        println!(
            "Firestore mode: project={}, watch_doc={}, music_collection={}",
            fire_cfg.project_id, fire_cfg.watch_doc, fire_cfg.music_collection
        );

        tokio::spawn(async move {
            let runner = FirestoreWatchToggle::new(fire_cfg.clone(), cmd_tx, telemetry_rx).await?;
            runner.run(fire_cfg.poll_ms).await
        })
    } else {
        println!("File control mode (Firestore env not set)");
        let control_file = config.control_file.clone();
        let poll_ms = config.control_poll_ms;
        tokio::spawn(async move { control_poll_task(control_file, poll_ms, cmd_tx).await })
    };

    let _ = tokio::try_join!(reader_task, writer_task, control_task)?;
    Ok(())
}
