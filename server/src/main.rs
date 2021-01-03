#[macro_use]
extern crate log;
#[macro_use]
extern crate diesel;

mod auth;
mod db;
mod errors;
mod handlers;
mod routes;
mod schema;
mod settings;

use settings::get_allowed_origins;
use std::env;
use warp::{hyper::Method, Filter};

use routes::routes;

#[tokio::main]
async fn main() {
    pretty_env_logger::init();

    let db_url = env::var("DATABASE_URL").expect("Unable to find DATABASE_URL");
    let pool = db::pg_pool(db_url);
    debug!("allowed origins: {:?}", get_allowed_origins());
    let cors = warp::cors()
        .allow_origins(get_allowed_origins())
        .allow_headers(vec!["content-type"])
        .allow_methods(&[Method::POST, Method::DELETE, Method::GET]);

    let routes = routes(pool)
        .with(warp::log("server::routes"))
        .with(cors)
        .recover(errors::handle_error);

    info!("Start the server");
    warp::serve(routes).run(([127, 0, 0, 1], 3030)).await;
}
