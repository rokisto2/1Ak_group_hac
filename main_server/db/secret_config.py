from pydantic_settings import BaseSettings, SettingsConfigDict


class SecretSettings(BaseSettings):
    EMAIL_CREDENTIALS_FILE: str
    EMAIL_APP_ADDRESS: str
    EMAIL_APP_NAME: str
    EMAIL_TOKEN_PATH: str

    SECRET_KEY: str
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30

    model_config = SettingsConfigDict(env_file=".env-secret")


secret_settings = SecretSettings()