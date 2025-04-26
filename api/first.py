from fastapi import APIRouter, UploadFile, File, HTTPException
import os
from typing import Optional

router = APIRouter()

# Используйте относительный путь или конфигурируйте его иначе
UPLOAD_FOLDER = os.path.abspath('uploads')


@router.post("/upload")
async def upload_file(file: UploadFile = File(...)):
    if not file.filename:
        raise HTTPException(status_code=400, detail="Имя файла пустое")

    try:
        file_path = os.path.join(UPLOAD_FOLDER, file.filename)
        contents = await file.read()
        file_size = len(contents)

        with open(file_path, 'wb') as f:  # исправлено на правильное открытие файла
            f.write(contents)

        return {
            "status": "success",
            "message": "Файл успешно загружен",
            "filename": file.filename,
            "size": file_size,
            "path": file_path
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Ошибка при загрузке файла: {str(e)}")