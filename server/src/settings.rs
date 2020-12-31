use std::env;

pub const BCRYPT_COST: u32 = 10;
pub const MAX_SALT_LEN: usize = 16;
pub const OUTPUT_LEN: usize = 24;
pub const BUF_SIZE: usize = 10000;
pub const JWT_SECRET: &'static str = env!("JWT_SECRET");

const ALLOWED_ORIGINS_STR: &'static str = env!("ALLOWED_ORIGINS");
pub fn get_allowed_origins() -> Vec<&'static str> {
    ALLOWED_ORIGINS_STR.split(',').collect()
}
