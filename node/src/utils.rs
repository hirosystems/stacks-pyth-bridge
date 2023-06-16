use std::{thread::sleep, time::Duration};

use chainhook_sdk::utils::Context;

use crate::service::BridgeTenureCommand;

pub enum ClockCommand {
    Terminate,
}

pub fn start_new_clock(
    updates_per_min: u64,
    tenure_cmd_tx: crossbeam_channel::Sender<BridgeTenureCommand>,
    ctx: &Context,
) -> crossbeam_channel::Sender<ClockCommand> {
    let (clock_cmd_tx, clock_cmd_rx) = crossbeam_channel::unbounded();

    let _context_cloned = ctx.clone();
    let _ = std::thread::spawn(move || loop {
        sleep(Duration::from_secs(60 / updates_per_min));
        if let Ok(ClockCommand::Terminate) = clock_cmd_rx.try_recv() {
            break;
        }
        let _ = tenure_cmd_tx.send(BridgeTenureCommand::PriceFeedBlockUpdatesTick);
    });
    clock_cmd_tx
}
