use std::env;

pub const BCRYPT_COST: u32 = 10;
pub const MAX_SALT_LEN: usize = 16;
pub const OUTPUT_LEN: usize = 24;
pub const BUF_SIZE: usize = 10000;
pub const TURN_TIMEOUT: u64 = 1800;
pub const JWT_SECRET: &'static str = env!("JWT_SECRET");
pub const TURN_SECRET: &'static str = env!("TURN_SECRET");
