use clap::{Parser, Subcommand};

use chainhook_sdk::utils::Context;

use crate::{
    config::{generator::generate_config, Config},
    service::{ping_bridge_service, start_bridge_service},
};

#[derive(Parser, Debug)]
#[clap(author, version, about, long_about = None)]
struct Opts {
    #[clap(subcommand)]
    command: Command,
}

#[derive(Subcommand, PartialEq, Clone, Debug)]
enum Command {
    /// Generate configuration file
    #[clap(subcommand)]
    Config(ConfigCommand),
    /// Run a service streaming blocks and submitting price feeds updates
    #[clap(subcommand)]
    Service(ServiceCommand),
}

#[derive(Subcommand, PartialEq, Clone, Debug)]
#[clap(bin_name = "config")]
enum ConfigCommand {
    /// Generate new config
    #[clap(name = "new", bin_name = "new", aliases = &["generate"])]
    New(NewConfig),
}

#[derive(Parser, PartialEq, Clone, Debug)]
struct NewConfig {
    /// Target Devnet network
    #[clap(
        long = "devnet",
        conflicts_with = "testnet",
        conflicts_with = "mainnet"
    )]
    pub devnet: bool,
    /// Target Testnet network
    #[clap(
        long = "testnet",
        conflicts_with = "devnet",
        conflicts_with = "mainnet"
    )]
    pub testnet: bool,
    /// Target Mainnet network
    #[clap(
        long = "mainnet",
        conflicts_with = "testnet",
        conflicts_with = "devnet"
    )]
    pub mainnet: bool,
}

#[derive(Subcommand, PartialEq, Clone, Debug)]
#[clap(bin_name = "service")]
enum ServiceCommand {
    /// Run a service bridging Pythnet's price feeds to the Stacks blockchain
    #[clap(name = "start", bin_name = "start")]
    Start(StartCommand),
    /// Fetch the price feed ids and check the balance of the hot wallet account
    #[clap(name = "ping", bin_name = "ping")]
    Ping(PingCommand),
}

#[derive(Parser, PartialEq, Clone, Debug)]
struct StartCommand {
    /// Load config file path
    #[clap(long = "config-path")]
    pub config_path: String,
    // /// Start REST API for managing configuration
    // #[clap(long = "start-http-api")]
    // pub start_http_api: bool,
}

#[derive(Parser, PartialEq, Clone, Debug)]
struct PingCommand {
    /// Load config file path
    #[clap(long = "config-path")]
    pub config_path: String,
}

pub fn main() {
    let logger = hiro_system_kit::log::setup_logger();
    let _guard = hiro_system_kit::log::setup_global_logger(logger.clone());
    let ctx = Context {
        logger: Some(logger),
        tracer: false,
    };

    let opts: Opts = match Opts::try_parse() {
        Ok(opts) => opts,
        Err(e) => {
            println!("{}", e);
            std::process::exit(1);
        }
    };

    match hiro_system_kit::nestable_block_on(handle_command(opts, ctx)) {
        Err(e) => {
            println!("{e}");
            std::process::exit(1);
        }
        Ok(_) => {}
    }
}

async fn handle_command(opts: Opts, ctx: Context) -> Result<(), String> {
    match opts.command {
        Command::Config(ConfigCommand::New(_options)) => {
            use std::fs::File;
            use std::io::Write;
            use std::path::PathBuf;
            let config_content = generate_config();
            let mut file_path = PathBuf::new();
            file_path.push("Bridge.toml");
            let mut file = File::create(&file_path)
                .map_err(|e| format!("unable to open file {}\n{}", file_path.display(), e))?;
            file.write_all(config_content.as_bytes())
                .map_err(|e| format!("unable to write file {}\n{}", file_path.display(), e))?;
            println!("Created file Chainhook.toml");
        }
        Command::Service(ServiceCommand::Start(options)) => {
            // Start service
            let config = Config::from_file_path(&options.config_path)?;
            start_bridge_service(&config, &ctx)?;
        }
        Command::Service(ServiceCommand::Ping(options)) => {
            // Start service
            let config = Config::from_file_path(&options.config_path)?;
            ping_bridge_service(&config, &ctx).await?;
        }
    }
    Ok(())
}
