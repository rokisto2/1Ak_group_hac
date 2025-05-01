from pydantic_settings import BaseSettings, SettingsConfigDict


class SecretSettings(BaseSettings):
    BOT_TOKEN:str
    EMAIL_CREDENTIALS_FILE: str
    EMAIL_APP_ADDRESS: str
    EMAIL_APP_NAME: str
    EMAIL_TOKEN_PATH: str

    model_config = SettingsConfigDict(env_file=".env-secret")


secret_settings = SecretSettings()