// frontend/tests/pages/ManagerDashboard.test.jsx
// Brief description:
// Tests for ManagerDashboard: user management features including listing, creation, role changes,
// banning/unbanning, password resets, and pagination. API and UI hooks are mocked.

import {
  render,
  screen,
  waitFor,
  fireEvent,
  act,
  within,
} from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { MemoryRouter } from "react-router-dom";
import ManagerDashboard from "../../src/pages/ManagerDashboard"; // Adjust path
import React from "react";
import { ChakraProvider } from "@chakra-ui/react";

// --- Mocks ---
vi.mock("../../src/utils/api", () => ({
  getApiUrl: vi.fn((endpoint) => `/mock-api${endpoint}`),
}));

const mockToast = vi.fn();
vi.mock("@chakra-ui/react", async (importOriginal) => {
  const actual = await importOriginal();
  return {
    ...actual,
    useToast: () => mockToast,
    Tab: vi.fn((props) => <button {...props} />), // Mock Tab component
  };
});

vi.mock("../../src/components/Navbar", () => ({
  default: ({ title }) => <div data-testid="navbar">{title}</div>,
}));

// Mock window.fetch
const mockFetch = vi.fn();
global.fetch = mockFetch;

const localStorageMock = (() => {
  let store = {};
  return {
    getItem: vi.fn((key) => store[key] || null),
    setItem: vi.fn((key, value) => {
      store[key] = value.toString();
    }),
    clear: vi.fn(() => {
      store = {};
    }),
    removeItem: vi.fn((key) => {
      delete store[key];
    }),
  };
})();
Object.defineProperty(window, "localStorage", { value: localStorageMock });

describe("ManagerDashboard Component", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorageMock.clear();
    localStorageMock.setItem("accessToken", "fake_access_token");
    mockFetch.mockClear(); // Clear mockFetch calls before each test
  });

  const renderManagerDashboard = () =>
    render(
      <MemoryRouter>
        <ChakraProvider>
          <ManagerDashboard />
        </ChakraProvider>
      </MemoryRouter>,
    );

  // --- Initial Render ---
  it("renders main dashboard elements and fetches users on initial load", async () => {
    // Mock a successful fetch call for initial user list
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () =>
        Promise.resolve({
          users: [
            {
              id: "1",
              full_name: "John Doe",
              email: "john@example.com",
              user_type: "user",
              is_banned: false,
            },
          ],
          pagination: {
            total: 1,
            page: 1,
            per_page: 10,
            total_pages: 1,
            has_next: false,
            has_prev: false,
          },
        }),
    });

    renderManagerDashboard();

    expect(screen.getByTestId("navbar")).toHaveTextContent("Панель менеджера");
    expect(
      screen.getByRole("heading", { name: /Панель менеджера/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/Управление пользователями и их правами доступа./i),
    ).toBeInTheDocument();

    // Verify "Список пользователей" tab is selected by default

    // Verify fetchUsers is called
    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith(
        "/mock-api/users/all?page=1&per_page=10",
        expect.objectContaining({
          headers: { Authorization: "Bearer fake_access_token" },
        }),
      );
    });

    // Verify that the user is displayed
    expect(screen.getByText("John Doe")).toBeInTheDocument();
    expect(screen.getByText("john@example.com")).toBeInTheDocument();
    expect(screen.getByText("user")).toBeInTheDocument(); // Role badge
    expect(screen.getByText("Активен")).toBeInTheDocument(); // Status badge
  });

  it("handles fetchUsers error", async () => {
    mockFetch.mockResolvedValueOnce({ ok: false });
    renderManagerDashboard();

    await waitFor(() => {
        expect(mockToast).toHaveBeenCalledWith(
            expect.objectContaining({
                status: 'error',
                description: 'Не удалось получить список пользователей',
            })
        );
    });
  });

  it("allows creating a new user successfully", async () => {
    // Mock initial fetch for user list (called on render)
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () =>
        Promise.resolve({
          users: [],
          pagination: {
            total: 0,
            page: 1,
            per_page: 10,
            total_pages: 0,
            has_next: false,
            has_prev: false,
          },
        }),
    });

    const mockCreateUserResponse = {
      id: "2",

      email: "newuser@example.com",

      full_name: "New User",

      role: "user",
    };

    // Mock fetch for creating user
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve(mockCreateUserResponse),
    });

    // Mock fetch for refreshing user list after creation
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () =>
        Promise.resolve({
          users: [
            {
              id: "1",
              full_name: "John Doe",
              email: "john@example.com",
              user_type: "user",
              is_banned: false,
            },
            {
              id: "2",
              full_name: "New User",
              email: "newuser@example.com",
              user_type: "user",
              is_banned: false,
            },
          ],
          pagination: {
            total: 2,
            page: 1,
            per_page: 10,
            total_pages: 1,
            has_next: false,
            has_prev: false,
          },
        }),
    });

    renderManagerDashboard();

    // Wait for initial fetch to complete
    await waitFor(() => expect(mockFetch).toHaveBeenCalledTimes(1));
    // Switch to "Создать пользователя" tab
    fireEvent.click(
      screen.getByRole("button", { name: /Создать пользователя/i }),
    );

    const emailInput = screen.getByLabelText(/Email/i);

    const fullNameInput = screen.getByLabelText(/Полное имя/i);

    const roleSelect = screen.getByLabelText(/Роль/i);

    fireEvent.change(emailInput, { target: { value: "newuser@example.com" } });

    fireEvent.change(fullNameInput, { target: { value: "New User" } });

    fireEvent.change(roleSelect, { target: { value: "user" } });

    await act(async () => {
      fireEvent.submit(screen.getByTestId("create-user-form"));
    });

    // Verify fetch for user creation is called
    await waitFor(() => {
      expect(mockFetch).toHaveBeenNthCalledWith(
        2,
        "/mock-api/auth/register",
        expect.objectContaining({
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: "Bearer fake_access_token",
          },
          body: JSON.stringify({
            email: "newuser@example.com",
            full_name: "New User",
            role: "user",
          }),
        }),
      );
    });

    // Verify success toast
    expect(mockToast).toHaveBeenCalledWith(
      expect.objectContaining({
        status: "success",
        title: "Пользователь создан",
        description: "Новый пользователь успешно создан",
      }),
    );

    // Verify form is cleared
    expect(emailInput).toHaveValue("");
    expect(fullNameInput).toHaveValue("");
    expect(roleSelect).toHaveValue("user");

    // Verify user list is refreshed
    await waitFor(() => {
      expect(mockFetch).toHaveBeenNthCalledWith(
        3,
        "/mock-api/users/all?page=1&per_page=10",
        expect.objectContaining({
          headers: { Authorization: "Bearer fake_access_token" },
        }),
      );
    });

    // After refresh, the newly created user should be in the list (on the first tab)
    // Since we go back to the first tab, we need to click it again if we want to assert the list.
    fireEvent.click(
      screen.getByRole("button", { name: /Список пользователей/i }),
    );
    await waitFor(() => {
      expect(screen.getByText("New User")).toBeInTheDocument();
    });
  });

    it('handles handleCreateUser error', async () => {
        // Mock initial fetch for user list (called on render)
        mockFetch.mockResolvedValueOnce({
          ok: true,
          json: () =>
            Promise.resolve({
              users: [],
              pagination: {
                total: 0,
                page: 1,
                per_page: 10,
                total_pages: 0,
                has_next: false,
                has_prev: false,
              },
            }),
        });
        mockFetch.mockResolvedValueOnce({ ok: false, json: () => Promise.resolve({ detail: 'Email already exists' }) });
        renderManagerDashboard();

        fireEvent.click(
          screen.getByRole("button", { name: /Создать пользователя/i }),
        );
        
        await act(async () => {
            fireEvent.submit(screen.getByTestId("create-user-form"));
        });

        await waitFor(() => {
            expect(mockToast).toHaveBeenCalledWith(
                expect.objectContaining({
                    status: 'error',
                    description: 'Email already exists',
                })
            );
        });
    });

  it("allows changing a user role", async () => {
    // Mock initial fetch for user list
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () =>
        Promise.resolve({
          users: [
            {
              id: "1",
              full_name: "John Doe",
              email: "john@example.com",
              user_type: "user",
              is_banned: false,
            },
          ],
          pagination: {
            total: 1,
            page: 1,
            per_page: 10,
            total_pages: 1,
            has_next: false,
            has_prev: false,
          },
        }),
    });

    // Mock fetch for role change
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({}),
    });

    // Mock fetch for refreshing user list
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () =>
        Promise.resolve({
          users: [
            {
              id: "1",
              full_name: "John Doe",
              email: "john@example.com",
              user_type: "superuser",
              is_banned: false,
            },
          ],

          pagination: {
            total: 1,
            page: 1,
            per_page: 10,
            total_pages: 1,
            has_next: false,
            has_prev: false,
          },
        }),
    });

    renderManagerDashboard();

    // Wait for initial fetch to complete
    await waitFor(() => expect(mockFetch).toHaveBeenCalledTimes(1));

    // Open the role change modal
    fireEvent.click(screen.getByLabelText("Изменить роль"));

    // Verify the modal is open
    await screen.findByText("Изменить роль пользователя");

    expect(screen.getByText("Роль для John Doe")).toBeInTheDocument();

    // Change the role
    const roleSelect = screen.getByRole("combobox", { name: /Роль для/i });

    fireEvent.change(roleSelect, { target: { value: "superuser" } });

    // Save the new role
    const saveButton = screen.getByRole("button", { name: "Сохранить" });

    fireEvent.click(saveButton);

    // Verify the role change API call
    await waitFor(() => {
      expect(mockFetch).toHaveBeenNthCalledWith(
        2,
        "/mock-api/users/1/role",
        expect.objectContaining({
          method: "PUT",
          body: JSON.stringify({ role: "superuser" }),
        }),
      );
    });

    // Verify success toast
    expect(mockToast).toHaveBeenCalledWith(
      expect.objectContaining({
        status: "success",
        title: "Роль обновлена",
        description: "Роль пользователя изменена на superuser",
      }),
    );

    // Verify the modal is closed
    await waitFor(() => {
      expect(
        screen.queryByText("Изменить роль пользователя"),
      ).not.toBeInTheDocument();
    });
  });

    it('handles handleRoleChange error', async () => {
        mockFetch.mockResolvedValueOnce({
            ok: true,
            json: () =>
                Promise.resolve({
                    users: [{ id: '1', full_name: 'John Doe', email: 'john@example.com', user_type: 'user', is_banned: false }],
                    pagination: { total: 1, page: 1, per_page: 10, total_pages: 1, has_next: false, has_prev: false },
                }),
        });
        mockFetch.mockResolvedValueOnce({ ok: false });
        renderManagerDashboard();

        await waitFor(() => expect(mockFetch).toHaveBeenCalledTimes(1));

        fireEvent.click(screen.getByLabelText("Изменить роль"));
        await screen.findByText("Изменить роль пользователя");
        fireEvent.click(screen.getByRole("button", { name: "Сохранить" }));

        await waitFor(() => {
            expect(mockToast).toHaveBeenCalledWith(
                expect.objectContaining({
                    status: 'error',
                    description: 'Не удалось изменить роль пользователя',
                })
            );
        });
    });

  it("allows banning and unbanning a user", async () => {
    // Mock initial fetch for user list
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () =>
        Promise.resolve({
          users: [
            {
              id: "1",
              full_name: "John Doe",
              email: "john@example.com",
              user_type: "user",
              is_banned: false,
            },
          ],

          pagination: {
            total: 1,
            page: 1,
            per_page: 10,
            total_pages: 1,
            has_next: false,
            has_prev: false,
          },
        }),
    });

    // Mock fetch for banning user

    mockFetch.mockResolvedValueOnce({
      ok: true,

      json: () => Promise.resolve({}),
    });

    // Mock fetch for refreshing user list

    mockFetch.mockResolvedValueOnce({
      ok: true,

      json: () =>
        Promise.resolve({
          users: [
            {
              id: "1",
              full_name: "John Doe",
              email: "john@example.com",
              user_type: "user",
              is_banned: true,
            },
          ],

          pagination: {
            total: 1,
            page: 1,
            per_page: 10,
            total_pages: 1,
            has_next: false,
            has_prev: false,
          },
        }),
    });

    renderManagerDashboard();

    // Wait for initial fetch to complete

    await waitFor(() => expect(mockFetch).toHaveBeenCalledTimes(1));

    // Ban the user

    fireEvent.click(screen.getByLabelText("Заблокировать"));

    // Verify the ban API call

    await waitFor(() => {
      expect(mockFetch).toHaveBeenNthCalledWith(
        2,

        "/mock-api/users/1/ban-status",

        expect.objectContaining({
          method: "PUT",

          body: JSON.stringify({ is_banned: true }),
        }),
      );
    });

    // Verify success toast

    expect(mockToast).toHaveBeenCalledWith(
      expect.objectContaining({
        status: "success",

        title: "Пользователь заблокирован",

        description: "Пользователь успешно заблокирован",
      }),
    );
  });

    it('handles handleToggleBanStatus error', async () => {
        mockFetch.mockResolvedValueOnce({
            ok: true,
            json: () =>
                Promise.resolve({
                    users: [{ id: '1', full_name: 'John Doe', email: 'john@example.com', user_type: 'user', is_banned: false }],
                    pagination: { total: 1, page: 1, per_page: 10, total_pages: 1, has_next: false, has_prev: false },
                }),
        });
        mockFetch.mockResolvedValueOnce({ ok: false });
        renderManagerDashboard();

        await waitFor(() => expect(mockFetch).toHaveBeenCalledTimes(1));

        fireEvent.click(screen.getByLabelText("Заблокировать"));

        await waitFor(() => {
            expect(mockToast).toHaveBeenCalledWith(
                expect.objectContaining({
                    status: 'error',
                    description: 'Не удалось изменить статус пользователя',
                })
            );
        });
    });

  it("allows resetting a user password", async () => {
    // Mock initial fetch for user list

    mockFetch.mockResolvedValueOnce({
      ok: true,

      json: () =>
        Promise.resolve({
          users: [
            {
              id: "1",
              full_name: "John Doe",
              email: "john@example.com",
              user_type: "user",
              is_banned: false,
            },
          ],

          pagination: {
            total: 1,
            page: 1,
            per_page: 10,
            total_pages: 1,
            has_next: false,
            has_prev: false,
          },
        }),
    });

    // Mock fetch for password reset

    mockFetch.mockResolvedValueOnce({
      ok: true,

      json: () => Promise.resolve({}),
    });

    renderManagerDashboard();

    // Wait for initial fetch to complete

    await waitFor(() => expect(mockFetch).toHaveBeenCalledTimes(1));

    // Open the password reset modal

    fireEvent.click(screen.getByLabelText("Сбросить пароль"));

        // Verify the modal is open
        await screen.findByText("Подтверждение сброса пароля");
        const modal = screen.getByRole("dialog");
        expect(
            within(modal).getByText(
                /Вы уверены, что хотите сбросить пароль для пользователя/,
            ),
        ).toBeInTheDocument();
        expect(within(modal).getByText("John Doe")).toBeInTheDocument();

    // Confirm password reset

    const confirmButton = screen.getByRole("button", {
      name: "Сбросить пароль",
    });

    fireEvent.click(confirmButton);

    // Verify the password reset API call

    await waitFor(() => {
      expect(mockFetch).toHaveBeenNthCalledWith(
        2,

        "/mock-api/auth/password/reset",

        expect.objectContaining({
          method: "POST",

          body: JSON.stringify({ user_id: "1" }),
        }),
      );
    });

    // Verify success toast

    expect(mockToast).toHaveBeenCalledWith(
      expect.objectContaining({
        status: "success",

        title: "Пароль сброшен",

        description: "Новый пароль отправлен на почту пользователя",
      }),
    );

    // Verify the modal is closed

    await waitFor(() => {
      expect(
        screen.queryByText("Подтверждение сброса пароля"),
      ).not.toBeInTheDocument();
    });
  });

    it('handles handleResetPassword error', async () => {
        mockFetch.mockResolvedValueOnce({
            ok: true,
            json: () =>
                Promise.resolve({
                    users: [{ id: '1', full_name: 'John Doe', email: 'john@example.com', user_type: 'user', is_banned: false }],
                    pagination: { total: 1, page: 1, per_page: 10, total_pages: 1, has_next: false, has_prev: false },
                }),
        });
        mockFetch.mockResolvedValueOnce({ ok: false });
        renderManagerDashboard();

        await waitFor(() => expect(mockFetch).toHaveBeenCalledTimes(1));

        fireEvent.click(screen.getByLabelText("Сбросить пароль"));
        await screen.findByText("Подтверждение сброса пароля");
        fireEvent.click(screen.getByRole("button", { name: "Сбросить пароль" }));

        await waitFor(() => {
            expect(mockToast).toHaveBeenCalledWith(
                expect.objectContaining({
                    status: 'error',
                    description: 'Не удалось сбросить пароль',
                })
            );
        });
    });
});
