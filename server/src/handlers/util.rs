use tokio::task::JoinError;

use crate::db::{PgPool, PooledPg};

pub async fn wait_for_connection(pool: PgPool) -> Result<Result<PooledPg, ()>, JoinError> {
    let get_conn = futures::future::lazy(move |_| -> Result<PooledPg, ()> {
        match pool.get() {
            Ok(conn) => Ok(conn),
            Err(_) => Err(()),
        }
    });
    return tokio::spawn(get_conn).await;
}
