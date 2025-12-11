import { useState, useCallback } from 'react';
import axios from 'axios';
import { getChatUrl } from '../utils/api';
import { User } from '../types/chat';

export const useUsers = (userId: string | null) => {
    const [users, setUsers] = useState<User[]>([]);

    const loadUsers = useCallback(async () => {
        if (!userId) return;
        try {
            const response = await axios.get(getChatUrl(`/users/${userId}/all`), {
                params: { page: 0, size: 1000 }
            });
            setUsers(response.data.content || []);
        } catch (error) {
            console.error('Ошибка загрузки пользователей', error);
        }
    }, [userId]);

    return {
        users,
        loadUsers
    };
};

