#[macro_use]
extern crate log;
#[macro_use]
extern crate diesel;

mod db;
mod errors;
mod handlers;
mod routes;
mod schema;

use std::env;
use warp::Filter;

use routes::routes;

#[tokio::main]
async fn main() {
    pretty_env_logger::init();

    let db_url = env::var("DATABASE_URL").expect("Unable to find DATABASE_URL");
    let pool = db::pg_pool(db_url);

    let routes = routes(pool).with(warp::log("server::routes"));

    info!("Start the server");
    warp::serve(routes).run(([127, 0, 0, 1], 3030)).await;
}
