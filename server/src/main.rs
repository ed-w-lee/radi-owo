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

use settings::DATABASE_URL;
use warp::{hyper::Method, Filter};

use routes::routes;

#[tokio::main]
async fn main() {
    pretty_env_logger::init();

    info!("Creating connection pool");
    let pool = db::pg_pool(DATABASE_URL.to_owned());
    let cors = warp::cors()
        .allow_any_origin() // sketchy but Firefox 85 only gives Origin: null for extension network requests
        .allow_headers(vec!["content-type"])
        .allow_methods(&[Method::POST, Method::DELETE, Method::GET]);

    let routes = routes(pool)
        .with(warp::log("server::routes"))
        .with(cors)
        .recover(errors::handle_error);

    info!("Start the server");
    warp::serve(routes).run(([127, 0, 0, 1], 3030)).await;
}
