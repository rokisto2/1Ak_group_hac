from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    BOT_TOKEN:str

    model_config = SettingsConfigDict(env_file="secret.env")


settings = Settings()