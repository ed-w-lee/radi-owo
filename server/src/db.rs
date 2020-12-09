use chrono::{DateTime, Utc};
use diesel::{
    pg::PgConnection,
    r2d2::{ConnectionManager, Pool, PooledConnection},
};
use serde::{Serialize, Serializer};
use uuid::Uuid;

use crate::schema::*;

pub type PgPool = Pool<ConnectionManager<PgConnection>>;
pub type PooledPg = PooledConnection<ConnectionManager<PgConnection>>;

#[derive(Debug, Identifiable, Queryable, Insertable, Serialize)]
pub struct User {
    pub id: Uuid,
    pub display_name: String,
    pub email: String,
    pub created_at: DateTime<Utc>,
}

// The query parameters for list_todos.
#[derive(Debug, Identifiable, Associations, Queryable, Insertable, Serialize)]
#[belongs_to(User)]
pub struct Room {
    pub id: Uuid,
    pub user_id: Uuid,
    pub room_name: String,
    pub host_status: i16,
    pub created_at: DateTime<Utc>,
    pub last_hosted: Option<DateTime<Utc>>,
}

pub fn pg_pool(db_url: String) -> PgPool {
    let manager = ConnectionManager::new(db_url);
    Pool::new(manager).expect("Unable to create connection pool")
}

#[derive(Debug)]
#[repr(i16)]
pub enum HostStatus {
    Unknown = 0,
    Stopped = 1,
    Playing = 2,
}

impl Serialize for HostStatus {
    fn serialize<S>(&self, serializer: S) -> Result<S::Ok, S::Error>
    where
        S: Serializer,
    {
        serializer.serialize_str(match self {
            HostStatus::Unknown => "unknown",
            HostStatus::Playing => "playing",
            HostStatus::Stopped => "stopped",
        })
    }
}

impl From<i16> for HostStatus {
    fn from(i: i16) -> Self {
        match i {
            x if x == HostStatus::Unknown as i16 => HostStatus::Unknown,
            x if x == HostStatus::Playing as i16 => HostStatus::Playing,
            x if x == HostStatus::Stopped as i16 => HostStatus::Stopped,
            x => {
                error!("attempting to convert invalid i16 to HostStatus: {}", x);
                HostStatus::Unknown
            }
        }
    }
}
