use tokio::task;

use crate::{
    db::{PgPool, PooledPg},
    errors::MyError,
};

pub async fn db_txn<TxnFn, RES>(pool: PgPool, read_only: bool, func: TxnFn) -> Result<RES, MyError>
where
    TxnFn: FnOnce(&PooledPg) -> Result<RES, MyError> + Send,
    RES: Send,
{
    task::block_in_place(move || -> Result<RES, MyError> {
        let conn_result = pool.get();
        if let Err(e) = conn_result {
            error!("Connection error: {}", e);
            return Err(MyError::DBConnectionError);
        }
        let conn = conn_result.unwrap();
        let base_txn = conn.build_transaction().deferrable();
        let access_txn = if read_only {
            base_txn.read_only()
        } else {
            base_txn.read_write()
        };
        access_txn.run(|| func(&conn))
    })
}
