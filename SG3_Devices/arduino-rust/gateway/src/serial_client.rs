use anyhow::{Context, Result};
use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::fs;
use std::path::{Path, PathBuf};
use std::time::SystemTime;
use tokio::io::{AsyncBufReadExt, AsyncRead, AsyncWrite, AsyncWriteExt, BufReader};
use tokio::net::TcpStream;
use tokio::sync::mpsc;
use tokio_serial::{SerialPortBuilderExt, SerialStream};

#[derive(Clone, Debug, Default, Serialize, Deserialize)]
pub struct ParsedState {
    pub values: HashMap<String, String>,
}

pub enum GatewayConnection {
    Serial(SerialStream),
    Tcp(TcpStream),
}

pub fn parse_state_line(line: &str) -> Option<ParsedState> {
    if !line.starts_with("STATE ") {
        return None;
    }

    let mut map = HashMap::new();
    for token in line[6..].split_whitespace() {
        let Some((k, v)) = token.split_once('=') else {
            continue;
        };
        map.insert(k.trim().to_lowercase(), v.trim().to_lowercase());
    }

    Some(ParsedState { values: map })
}

fn write_state_json(path: &Path, state: &ParsedState) -> Result<()> {
    if let Some(parent) = path.parent() {
        fs::create_dir_all(parent)?;
    }

    let payload = serde_json::json!({
        "updatedAt": format!("{:?}", SystemTime::now()),
        "state": state.values,
    });

    fs::write(path, serde_json::to_vec_pretty(&payload)?).with_context(|| {
        format!("failed writing state file: {}", path.display())
    })?;

    Ok(())
}

pub async fn open_connection(serial_port: &str, serial_baud: u32) -> Result<GatewayConnection> {
    if let Some(addr) = serial_port.strip_prefix("tcp://") {
        let stream = TcpStream::connect(addr)
            .await
            .with_context(|| format!("failed connecting TCP endpoint {}", addr))?;
        return Ok(GatewayConnection::Tcp(stream));
    }

    let stream = tokio_serial::new(serial_port, serial_baud)
        .open_native_async()
        .with_context(|| format!("failed opening serial port {}", serial_port))?;

    tokio::time::sleep(std::time::Duration::from_secs(2)).await;
    Ok(GatewayConnection::Serial(stream))
}

pub async fn serial_reader_task<R>(
    reader: R,
    state_path: PathBuf,
    telemetry_tx: mpsc::Sender<ParsedState>,
) -> Result<()>
where
    R: AsyncRead + Unpin,
{
    let mut lines = BufReader::new(reader).lines();

    while let Some(line) = lines.next_line().await? {
        let trimmed = line.trim();
        if trimmed.is_empty() {
            continue;
        }

        if let Some(state) = parse_state_line(trimmed) {
            write_state_json(&state_path, &state)?;
            let _ = telemetry_tx.send(state).await;
        } else {
            println!("Arduino: {}", trimmed);
        }
    }

    Ok(())
}

pub async fn serial_writer_task<W>(
    mut writer: W,
    mut rx: mpsc::Receiver<String>,
) -> Result<()>
where
    W: AsyncWrite + Unpin,
{
    while let Some(cmd) = rx.recv().await {
        writer.write_all(cmd.as_bytes()).await?;
        writer.write_all(b"\n").await?;
        writer.flush().await?;
        println!("TX: {}", cmd);
    }

    Ok(())
}
