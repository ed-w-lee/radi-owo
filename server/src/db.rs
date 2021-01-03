use chrono::{DateTime, Utc};
use diesel::{
    pg::PgConnection,
    r2d2::{ConnectionManager, Pool, PooledConnection},
};
use serde::Serialize;
use uuid::Uuid;

use crate::schema::*;

pub type PgPool = Pool<ConnectionManager<PgConnection>>;
pub type PooledPg = PooledConnection<ConnectionManager<PgConnection>>;

#[derive(Identifiable, Queryable, Insertable)]
pub struct User {
    pub id: Uuid,
    pub display_name: String,
    pub email: String,
    pub created_at: DateTime<Utc>,
    pub pass_hash: Vec<u8>,
    pub salt: Vec<u8>,
}

#[derive(Debug, Serialize, Queryable)]
pub struct UserQueryResult {
    pub id: Uuid,
    pub display_name: String,
    pub email: String,
    pub created_at: DateTime<Utc>,
}

impl From<User> for UserQueryResult {
    fn from(user: User) -> Self {
        Self {
            id: user.id,
            display_name: user.display_name,
            email: user.email,
            created_at: user.created_at,
        }
    }
}

#[derive(Debug, Identifiable, Associations, Queryable, Insertable, Serialize)]
#[belongs_to(User)]
pub struct Room {
    pub id: Uuid,
    pub user_id: Uuid,
    pub room_name: String,
    pub created_at: DateTime<Utc>,
    pub last_connected: Option<DateTime<Utc>>,
}

pub fn pg_pool(db_url: String) -> PgPool {
    let manager = ConnectionManager::new(db_url);
    Pool::new(manager).expect("Unable to create connection pool")
}
