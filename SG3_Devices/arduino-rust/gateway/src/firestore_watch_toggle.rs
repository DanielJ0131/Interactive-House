use anyhow::{anyhow, Context, Result};
use chrono::Utc;
use firestore::{FirestoreDb, FirestoreDbOptions, FirestoreGetByIdSupport, FirestoreUpdateSupport};
use futures_util::StreamExt;
use serde::{Deserialize, Serialize};
use serde_json::Value;
use std::collections::HashMap;
use std::path::{Path, PathBuf};
use std::time::Duration;
use tokio::sync::mpsc;

use crate::serial_client::ParsedState;

#[derive(Clone, Debug)]
pub struct FirestoreConfig {
    pub project_id: String,
    pub service_account_path: String,
    pub watch_doc: String,
    pub music_collection: String,
    pub poll_ms: u64,
}

#[derive(Clone, Debug, Default, Serialize, Deserialize)]
pub struct DesiredState {
    #[serde(default)]
    pub fan: Option<DeviceState>,
    #[serde(default)]
    pub fan_ina: Option<DeviceState>,
    #[serde(default)]
    pub fan_inb: Option<DeviceState>,
    #[serde(default)]
    pub door: Option<DeviceState>,
    #[serde(default)]
    pub window: Option<DeviceState>,
    #[serde(default)]
    pub buzzer: Option<DeviceState>,
    #[serde(default)]
    pub music: Option<DeviceState>,
    #[serde(default)]
    pub white_light: Option<DeviceState>,
    #[serde(default)]
    pub orange_light: Option<ValueDevice>,
    #[serde(default)]
    pub led_text_display: Option<String>,
}

#[derive(Clone, Debug, Default, Serialize, Deserialize)]
pub struct DeviceState {
    #[serde(default)]
    pub state: Option<String>,
}

#[derive(Clone, Debug, Default, Serialize, Deserialize)]
pub struct ValueDevice {
    #[serde(default)]
    pub value: Option<i64>,
}

pub struct FirestoreWatchToggle {
    db: FirestoreDb,
    watch_collection: String,
    watch_doc_id: String,
    music_collection: String,
    cmd_tx: mpsc::Sender<String>,
    telemetry_rx: mpsc::Receiver<ParsedState>,

    last_desired: DesiredState,
    desired_initialized: bool,
    suppress_control_once: bool,
    last_synced_state: HashMap<String, String>,
    last_song_states: HashMap<String, String>,
    active_song_id: Option<String>,
}

impl FirestoreWatchToggle {
    pub async fn new(
        cfg: FirestoreConfig,
        cmd_tx: mpsc::Sender<String>,
        telemetry_rx: mpsc::Receiver<ParsedState>,
    ) -> Result<Self> {
        let watch_doc_abs = cfg.watch_doc.clone();
        let (watch_collection, watch_doc_id) = split_doc_path(&watch_doc_abs)?;

        let service_account = if Path::new(&cfg.service_account_path).is_absolute() {
            PathBuf::from(cfg.service_account_path)
        } else {
            std::env::current_dir()
                .unwrap_or_else(|_| PathBuf::from("."))
                .join(cfg.service_account_path)
        };

        let db = FirestoreDb::with_options_service_account_key_file(
            FirestoreDbOptions::new(cfg.project_id),
            service_account,
        )
        .await
        .context("failed to initialize Firestore client")?;

        Ok(Self {
            db,
            watch_collection,
            watch_doc_id,
            music_collection: cfg.music_collection,
            cmd_tx,
            telemetry_rx,
            last_desired: DesiredState::default(),
            desired_initialized: false,
            suppress_control_once: false,
            last_synced_state: HashMap::new(),
            last_song_states: HashMap::new(),
            active_song_id: None,
        })
    }

    pub async fn run(mut self, poll_ms: u64) -> Result<()> {
        let mut ticker = tokio::time::interval(Duration::from_millis(poll_ms.max(200)));

        loop {
            tokio::select! {
                _ = ticker.tick() => {
                    if let Err(err) = self.poll_control_doc().await {
                        eprintln!("Firestore control poll error: {err}");
                    }
                    if let Err(err) = self.poll_music_collection().await {
                        eprintln!("Firestore music poll error: {err}");
                    }
                }
                maybe_state = self.telemetry_rx.recv() => {
                    if let Some(state) = maybe_state {
                        if let Err(err) = self.sync_arduino_to_firestore(state).await {
                            eprintln!("Firestore telemetry sync error: {err}");
                        }
                    } else {
                        return Ok(());
                    }
                }
            }
        }
    }

    async fn poll_control_doc(&mut self) -> Result<()> {
        let doc = self
            .db
            .get_obj_if_exists::<Value, _>(&self.watch_collection, &self.watch_doc_id, None)
            .await
            .context("get watch doc failed")?;

        let Some(json) = doc else {
            return Ok(());
        };

        let next = desired_from_json(&json);
        if !self.desired_initialized {
            self.last_desired = next;
            self.desired_initialized = true;
            return Ok(());
        }

        if self.suppress_control_once {
            self.last_desired = next;
            self.suppress_control_once = false;
            return Ok(());
        }

        let commands = emit_commands(&mut self.last_desired, &next);
        for cmd in commands {
            self.cmd_tx
                .send(cmd)
                .await
                .map_err(|_| anyhow!("command channel closed"))?;
        }

        Ok(())
    }

    async fn poll_music_collection(&mut self) -> Result<()> {
        let mut stream = self
            .db
            .fluent()
            .list()
            .from(&self.music_collection)
            .stream_all()
            .await
            .context("list music collection failed")?;

        while let Some(doc) = stream.next().await {
            let doc_id = doc
                .name
                .rsplit('/')
                .next()
                .map(|s| s.to_string())
                .unwrap_or_else(|| "unknown".to_string());

            let data: Value = FirestoreDb::deserialize_doc_to(&doc)
                .with_context(|| format!("deserialize music doc {} failed", doc_id))?;

            self.handle_music_change(&doc_id, &data).await?;
        }

        Ok(())
    }

    async fn handle_music_change(&mut self, song_id: &str, song_data: &Value) -> Result<()> {
        let state = to_on_off(extract_field_value(song_data.get("state")));
        let previous = self.last_song_states.get(song_id).cloned();

        if previous.is_none() {
            self.last_song_states
                .insert(song_id.to_string(), state.clone().unwrap_or_default());
            return Ok(());
        }

        if state.as_deref() == Some("on") {
            let (freqs, delays) = parse_song_arrays(song_data)?;
            if previous.as_deref() != Some("on") {
                self.send_song(&freqs, &delays).await?;
                self.send_cmd("P:1").await?;
                self.active_song_id = Some(song_id.to_string());
            }
        } else if state.as_deref() == Some("off") {
            if previous.as_deref() == Some("on") && self.active_song_id.as_deref() == Some(song_id) {
                self.send_cmd("P:0").await?;
                self.active_song_id = None;
            }
        }

        self.last_song_states
            .insert(song_id.to_string(), state.unwrap_or_default());
        Ok(())
    }

    async fn send_song(&self, notes: &[i64], delays: &[i64]) -> Result<()> {
        self.send_cmd("C").await?;
        tokio::time::sleep(Duration::from_millis(30)).await;

        for (n, d) in notes.iter().zip(delays.iter()) {
            self.send_cmd(&format!("A:{},{}", n, d)).await?;
            tokio::time::sleep(Duration::from_millis(12)).await;
        }

        self.send_cmd("E").await?;
        Ok(())
    }

    async fn sync_arduino_to_firestore(&mut self, state: ParsedState) -> Result<()> {
        let mut update_mask: Vec<String> = Vec::new();
        let mut patch = serde_json::json!({});

        // Write observed actuator state into the existing pin-based fields.
        // A one-poll suppression guard prevents self-write feedback loops.
        apply_string_update(
            &mut self.last_synced_state,
            &mut patch,
            &mut update_mask,
            "door.state",
            to_open_close(state.values.get("door").cloned()),
        );
        apply_string_update(
            &mut self.last_synced_state,
            &mut patch,
            &mut update_mask,
            "window.state",
            to_open_close(state.values.get("window").cloned()),
        );
        apply_string_update(
            &mut self.last_synced_state,
            &mut patch,
            &mut update_mask,
            "buzzer.state",
            to_on_off(state.values.get("buzzer").cloned()),
        );
        apply_string_update(
            &mut self.last_synced_state,
            &mut patch,
            &mut update_mask,
            "fan_INA.state",
            to_on_off(state.values.get("fan_ina").cloned()),
        );
        apply_string_update(
            &mut self.last_synced_state,
            &mut patch,
            &mut update_mask,
            "fan_INB.state",
            to_on_off(state.values.get("fan_inb").cloned()),
        );
        apply_string_update(
            &mut self.last_synced_state,
            &mut patch,
            &mut update_mask,
            "white_light.state",
            to_on_off(state.values.get("white_light").cloned()),
        );
        apply_i64_update(
            &mut self.last_synced_state,
            &mut patch,
            &mut update_mask,
            "orange_light.value",
            to_brightness(state.values.get("orange_light").cloned()),
        );

        apply_i64_update(
            &mut self.last_synced_state,
            &mut patch,
            &mut update_mask,
            "telemetry.gas",
            to_i64(state.values.get("gas").cloned()),
        );
        apply_i64_update(
            &mut self.last_synced_state,
            &mut patch,
            &mut update_mask,
            "telemetry.light",
            to_i64(state.values.get("light").cloned()),
        );
        apply_i64_update(
            &mut self.last_synced_state,
            &mut patch,
            &mut update_mask,
            "telemetry.soil",
            to_i64(state.values.get("soil").cloned()),
        );
        apply_i64_update(
            &mut self.last_synced_state,
            &mut patch,
            &mut update_mask,
            "telemetry.steam",
            to_i64(state.values.get("steam").cloned()),
        );
        apply_i64_update(
            &mut self.last_synced_state,
            &mut patch,
            &mut update_mask,
            "telemetry.motion",
            to_i64(state.values.get("motion").cloned()),
        );

        if update_mask.is_empty() {
            return Ok(());
        }

        let now = Utc::now();
        set_json_path(
            &mut patch,
            "sync.lastSource",
            Value::String("Arduino Rust Gateway".to_string()),
        );
        update_mask.push("sync.lastSource".to_string());
        set_json_path(
            &mut patch,
            "sync.lastUpdatedAt.seconds",
            Value::from(now.timestamp()),
        );
        update_mask.push("sync.lastUpdatedAt.seconds".to_string());
        set_json_path(
            &mut patch,
            "sync.lastUpdatedAt.nanoseconds",
            Value::from(now.timestamp_subsec_nanos() as i64),
        );
        update_mask.push("sync.lastUpdatedAt.nanoseconds".to_string());

        let updated_fields = update_mask.len();

        let _: Value = self
            .db
            .update_obj(
                &self.watch_collection,
                &self.watch_doc_id,
                &patch,
                Some(update_mask),
                None,
                None,
            )
            .await
            .context("update watch doc failed")?;

        println!(
            "Firestore telemetry synced: {} fields -> {}/{}",
            updated_fields,
            self.watch_collection,
            self.watch_doc_id
        );

        self.suppress_control_once = true;

        Ok(())
    }

    async fn send_cmd(&self, cmd: &str) -> Result<()> {
        self.cmd_tx
            .send(cmd.to_string())
            .await
            .map_err(|_| anyhow!("command channel closed"))
    }
}

fn apply_string_update(
    last_synced: &mut HashMap<String, String>,
    patch: &mut Value,
    mask: &mut Vec<String>,
    field_path: &str,
    next: Option<String>,
) {
    let Some(next_value) = next else {
        return;
    };

    let key = field_path.to_string();
    if last_synced.get(&key) == Some(&next_value) {
        return;
    }

    set_json_path(patch, field_path, Value::String(next_value.clone()));
    mask.push(field_path.to_string());
    last_synced.insert(key, next_value);
}

fn apply_i64_update(
    last_synced: &mut HashMap<String, String>,
    patch: &mut Value,
    mask: &mut Vec<String>,
    field_path: &str,
    next: Option<i64>,
) {
    let Some(next_value) = next else {
        return;
    };

    let key = field_path.to_string();
    let next_str = next_value.to_string();
    if last_synced.get(&key) == Some(&next_str) {
        return;
    }

    set_json_path(patch, field_path, Value::from(next_value));
    mask.push(field_path.to_string());
    last_synced.insert(key, next_str);
}

fn split_doc_path(path: &str) -> Result<(String, String)> {
    let parts: Vec<&str> = path.split('/').filter(|s| !s.is_empty()).collect();
    if parts.len() < 2 || parts.len() % 2 != 0 {
        return Err(anyhow!(
            "WATCH_DOC must be a valid Firestore document path, got: {}",
            path
        ));
    }

    let doc_id = parts[parts.len() - 1].to_string();
    let collection_path = parts[..parts.len() - 1].join("/");
    Ok((collection_path, doc_id))
}

fn extract_field_value(v: Option<&Value>) -> Option<String> {
    let val = v?;
    if let Some(obj) = val.as_object() {
        for key in ["state", "value", "status", "isOpen", "open", "isOn", "on", "enabled"] {
            if let Some(inner) = obj.get(key) {
                return scalar_to_string(inner);
            }
        }
        None
    } else {
        scalar_to_string(val)
    }
}

fn scalar_to_string(v: &Value) -> Option<String> {
    match v {
        Value::Null => None,
        Value::Bool(b) => Some(if *b { "true".to_string() } else { "false".to_string() }),
        Value::Number(n) => Some(n.to_string()),
        Value::String(s) => Some(s.clone()),
        _ => None,
    }
}

fn to_on_off(v: Option<String>) -> Option<String> {
    match v?.trim().to_lowercase().as_str() {
        "on" | "1" | "true" | "yes" | "enabled" => Some("on".to_string()),
        "off" | "0" | "false" | "no" | "disabled" => Some("off".to_string()),
        _ => None,
    }
}

fn to_open_close(v: Option<String>) -> Option<String> {
    match v?.trim().to_lowercase().as_str() {
        "open" | "opened" | "1" | "true" | "yes" | "on" => Some("open".to_string()),
        "close" | "closed" | "0" | "false" | "no" | "off" => Some("close".to_string()),
        _ => None,
    }
}

fn to_i64(v: Option<String>) -> Option<i64> {
    v?.trim().parse::<i64>().ok()
}

fn to_brightness(v: Option<String>) -> Option<i64> {
    let raw = v?;
    let s = raw.trim().to_lowercase();

    if let Ok(parsed) = s.parse::<i64>() {
        return Some(parsed.clamp(0, 255));
    }

    match s.as_str() {
        "on" | "true" | "yes" | "enabled" => Some(255),
        "off" | "false" | "no" | "disabled" => Some(0),
        _ => None,
    }
}

fn desired_from_json(json: &Value) -> DesiredState {
    DesiredState {
        fan: json.get("fan").and_then(|v| serde_json::from_value(v.clone()).ok()),
        fan_ina: json.get("fan_INA").and_then(|v| serde_json::from_value(v.clone()).ok()),
        fan_inb: json.get("fan_INB").and_then(|v| serde_json::from_value(v.clone()).ok()),
        door: json.get("door").and_then(|v| serde_json::from_value(v.clone()).ok()),
        window: json.get("window").and_then(|v| serde_json::from_value(v.clone()).ok()),
        buzzer: json.get("buzzer").and_then(|v| serde_json::from_value(v.clone()).ok()),
        music: json.get("music").and_then(|v| serde_json::from_value(v.clone()).ok()),
        white_light: json.get("white_light").and_then(|v| serde_json::from_value(v.clone()).ok()),
        orange_light: json.get("orange_light").and_then(|v| serde_json::from_value(v.clone()).ok()),
        led_text_display: json.get("ledTextDisplay").and_then(|v| v.as_str().map(|s| s.to_string())),
    }
}

pub fn emit_commands(prev: &mut DesiredState, next: &DesiredState) -> Vec<String> {
    let mut out = Vec::new();

    let fan_legacy = to_on_off(next.fan.as_ref().and_then(|v| v.state.clone()));
    let prev_fan_legacy = to_on_off(prev.fan.as_ref().and_then(|v| v.state.clone()));
    if let Some(v) = fan_legacy {
        if Some(v.clone()) != prev_fan_legacy {
            out.push("F".to_string());
        }
    }

    let fan_ina = to_on_off(next.fan_ina.as_ref().and_then(|v| v.state.clone()));
    let prev_fan_ina = to_on_off(prev.fan_ina.as_ref().and_then(|v| v.state.clone()));
    if let Some(v) = fan_ina {
        if Some(v.clone()) != prev_fan_ina {
            out.push("X".to_string());
        }
    }

    let fan_inb = to_on_off(next.fan_inb.as_ref().and_then(|v| v.state.clone()));
    let prev_fan_inb = to_on_off(prev.fan_inb.as_ref().and_then(|v| v.state.clone()));
    if let Some(v) = fan_inb {
        if Some(v.clone()) != prev_fan_inb {
            out.push("Y".to_string());
        }
    }

    let door = to_open_close(next.door.as_ref().and_then(|v| v.state.clone()));
    let prev_door = to_open_close(prev.door.as_ref().and_then(|v| v.state.clone()));
    if let Some(v) = door {
        if Some(v.clone()) != prev_door {
            out.push(if v == "open" { "D:1" } else { "D:0" }.to_string());
        }
    }

    let window = to_open_close(next.window.as_ref().and_then(|v| v.state.clone()));
    let prev_window = to_open_close(prev.window.as_ref().and_then(|v| v.state.clone()));
    if let Some(v) = window {
        if Some(v.clone()) != prev_window {
            out.push(if v == "open" { "N:1" } else { "N:0" }.to_string());
        }
    }

    let buzzer = to_on_off(next.buzzer.as_ref().and_then(|v| v.state.clone()));
    let prev_buzzer = to_on_off(prev.buzzer.as_ref().and_then(|v| v.state.clone()));
    if let Some(v) = buzzer {
        if Some(v.clone()) != prev_buzzer {
            out.push(if v == "on" { "B:1" } else { "B:0" }.to_string());
        }
    }

    let music = to_on_off(next.music.as_ref().and_then(|v| v.state.clone()));
    let prev_music = to_on_off(prev.music.as_ref().and_then(|v| v.state.clone()));
    if let Some(v) = music {
        if Some(v.clone()) != prev_music {
            out.push(if v == "on" { "P:1" } else { "P:0" }.to_string());
        }
    }

    let white = to_on_off(next.white_light.as_ref().and_then(|v| v.state.clone()));
    let prev_white = to_on_off(prev.white_light.as_ref().and_then(|v| v.state.clone()));
    if let Some(v) = white {
        if Some(v.clone()) != prev_white {
            out.push("W".to_string());
        }
    }

    let orange = next.orange_light.as_ref().and_then(|v| v.value).map(|v| v.clamp(0, 255));
    let prev_orange = prev.orange_light.as_ref().and_then(|v| v.value).map(|v| v.clamp(0, 255));
    if let Some(v) = orange {
        if Some(v) != prev_orange {
            out.push(format!("O:{}", v));
        }
    }

    if let Some(msg) = next.led_text_display.as_deref() {
        if prev.led_text_display.as_deref() != Some(msg) {
            let trimmed: String = msg.chars().take(16).collect();
            out.push(format!("M{}|", trimmed));
        }
    }

    *prev = next.clone();
    out
}

fn parse_song_arrays(song_doc: &Value) -> Result<(Vec<i64>, Vec<i64>)> {
    let frequencies = song_doc
        .get("frequencies")
        .and_then(|v| v.as_array())
        .ok_or_else(|| anyhow!("frequencies missing or invalid"))?;

    let note_delays = song_doc
        .get("noteDelays")
        .and_then(|v| v.as_array())
        .ok_or_else(|| anyhow!("noteDelays missing or invalid"))?;

    if frequencies.is_empty() || frequencies.len() != note_delays.len() {
        return Err(anyhow!("frequencies/noteDelays length mismatch"));
    }

    let mut out_freq = Vec::with_capacity(frequencies.len());
    let mut out_delay = Vec::with_capacity(note_delays.len());

    for (f, d) in frequencies.iter().zip(note_delays.iter()) {
        let freq = scalar_to_string(f)
            .and_then(|s| s.parse::<i64>().ok())
            .ok_or_else(|| anyhow!("invalid frequency"))?;
        let delay = scalar_to_string(d)
            .and_then(|s| s.parse::<i64>().ok())
            .ok_or_else(|| anyhow!("invalid delay"))?;
        if delay <= 0 {
            return Err(anyhow!("delay must be > 0"));
        }
        out_freq.push(freq);
        out_delay.push(delay);
    }

    Ok((out_freq, out_delay))
}

fn set_json_path(root: &mut Value, path: &str, value: Value) {
    let mut current = root;
    let mut parts = path.split('.').peekable();

    while let Some(part) = parts.next() {
        if parts.peek().is_none() {
            if let Some(obj) = current.as_object_mut() {
                obj.insert(part.to_string(), value);
            }
            return;
        }

        if current.get(part).is_none() {
            if let Some(obj) = current.as_object_mut() {
                obj.insert(part.to_string(), serde_json::json!({}));
            }
        }

        current = current.get_mut(part).unwrap();
    }
}
