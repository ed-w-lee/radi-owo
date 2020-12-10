use rand::{thread_rng, RngCore};

use crate::settings::MAX_SALT_LEN;

pub fn gen_salt() -> [u8; MAX_SALT_LEN] {
    let mut unencoded = [0u8; MAX_SALT_LEN];
    let mut rng = thread_rng();
    rng.fill_bytes(&mut unencoded);
    unencoded
}
