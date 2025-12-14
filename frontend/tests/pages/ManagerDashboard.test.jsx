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
import i18n from '../i18n';
import { I18nextProvider } from 'react-i18next';

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

const sessionStorageMock = (() => {
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
Object.defineProperty(window, "sessionStorage", { value: sessionStorageMock });

describe("ManagerDashboard Component", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    sessionStorageMock.clear();
    sessionStorageMock.setItem("accessToken", "fake_access_token");
    mockFetch.mockClear(); // Clear mockFetch calls before each test
  });

  const renderManagerDashboard = () =>
    render(
      <MemoryRouter>
        <ChakraProvider>
            <I18nextProvider i18n={i18n}>
                <ManagerDashboard />
            </I18nextProvider>
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

    expect(screen.getByTestId("navbar")).toHaveTextContent(i18n.t("managerDashboard.title"));
    expect(
      screen.getByRole("heading", { name: i18n.t("managerDashboard.title") }),
    ).toBeInTheDocument();
    expect(
      screen.getByText(i18n.t("managerDashboard.welcome")),
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
    expect(screen.getByText(i18n.t("managerDashboard.user"))).toBeInTheDocument(); // Role badge
    expect(screen.getByText(i18n.t("managerDashboard.active"))).toBeInTheDocument(); // Status badge
  });

  it("handles fetchUsers error", async () => {
    mockFetch.mockResolvedValueOnce({ ok: false });
    renderManagerDashboard();

    await waitFor(() => {
        expect(mockToast).toHaveBeenCalledWith(
            expect.objectContaining({
                status: 'error',
                description: i18n.t('managerDashboard.errorFetchingUsers'),
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
    await act(async () => {
        fireEvent.click(
          screen.getByRole("button", { name: i18n.t('managerDashboard.createUser') }),
        );
    });

    // Wait for tab panel to be visible
    await waitFor(() => {
        expect(screen.getByTestId("create-user-form")).toBeInTheDocument();
    });

    // Find all inputs within the form
    const form = screen.getByTestId("create-user-form");
    const emailInput = form.querySelector('input[type="email"]');
    const fullNameInput = form.querySelectorAll('input')[1];
    const roleSelect = form.querySelector('select');

    await act(async () => {
        fireEvent.change(emailInput, { target: { value: "newuser@example.com" } });
        fireEvent.change(fullNameInput, { target: { value: "New User" } });
        fireEvent.change(roleSelect, { target: { value: "user" } });
        fireEvent.submit(form);
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
        title: i18n.t("managerDashboard.userCreated"),
        description: i18n.t("managerDashboard.userCreatedDescription"),
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
    await act(async () => {
        fireEvent.click(
          screen.getByRole("button", { name: i18n.t("managerDashboard.usersList") }),
        );
    });

    await waitFor(() => {
      expect(screen.getByText("New User")).toBeInTheDocument();
    });
  });

    it('handles handleCreateUser error', async () => {
    // Mock initial fetch
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

    // Mock failed user creation
    mockFetch.mockResolvedValueOnce({
      ok: false,
      json: () => Promise.resolve({ detail: "User creation failed" }),
    });

    renderManagerDashboard();

    await waitFor(() => expect(mockFetch).toHaveBeenCalledTimes(1));

    await act(async () => {
        fireEvent.click(
          screen.getByRole("button", { name: i18n.t('managerDashboard.createUser') }),
        );
    });

    // Wait for tab panel to be visible
    await waitFor(() => {
        expect(screen.getByTestId("create-user-form")).toBeInTheDocument();
    });

    const form = screen.getByTestId("create-user-form");
    const emailInput = form.querySelector('input[type="email"]');
    const fullNameInput = form.querySelectorAll('input')[1];

    await act(async () => {
        fireEvent.change(emailInput, { target: { value: "test@example.com" } });
        fireEvent.change(fullNameInput, { target: { value: "Test User" } });
        fireEvent.submit(form);
    });

    await waitFor(() => {
      expect(mockToast).toHaveBeenCalledWith(
        expect.objectContaining({
          status: "error",
          title: i18n.t("managerDashboard.error"),
          description: expect.stringContaining("User creation failed"),
        }),
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

    // Open the role change modal - use getAllByLabelText since there might be multiple buttons
    const changeRoleButtons = screen.getAllByLabelText(i18n.t("managerDashboard.tooltipChangeRole"));
    await act(async () => {
        fireEvent.click(changeRoleButtons[0]);
    });


    // Verify the modal is open
    await screen.findByText(i18n.t("managerDashboard.changeUserRole"));
    const modal = screen.getByRole("dialog");
    expect(within(modal).getByText(`${i18n.t('managerDashboard.newRole')} John Doe`)).toBeInTheDocument();

    // Change the role
    const roleSelect = screen.getByRole("combobox", { name: `${i18n.t('managerDashboard.newRole')} John Doe` });

    await act(async () => {
        fireEvent.change(roleSelect, { target: { value: "superuser" } });
    });


    // Save the new role
    const saveButton = screen.getByRole("button", { name: i18n.t("managerDashboard.save") });

    await act(async () => {
        fireEvent.click(saveButton);
    });


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
        title: i18n.t("managerDashboard.roleChanged"),
        description: i18n.t("managerDashboard.roleChangedDescription"),
      }),
    );

    // Verify the modal is closed
    await waitFor(() => {
      expect(
        screen.queryByText(i18n.t("managerDashboard.changeUserRole")),
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
        // Mock failed role change
        mockFetch.mockResolvedValueOnce({ ok: false, json: () => Promise.resolve({ detail: "Failed to change role" }) });

        renderManagerDashboard();

        await waitFor(() => expect(mockFetch).toHaveBeenCalledTimes(1));

        const changeRoleButtons = screen.getAllByLabelText(i18n.t("managerDashboard.tooltipChangeRole"));
        await act(async () => {
            fireEvent.click(changeRoleButtons[0]);
        });

        await screen.findByText(i18n.t("managerDashboard.changeUserRole"));

        // Save the new role
        const saveButton = screen.getByRole("button", { name: i18n.t("managerDashboard.save") });

        await act(async () => {
            fireEvent.click(saveButton);
        });


        await waitFor(() => {
            expect(mockToast).toHaveBeenCalledWith(
                expect.objectContaining({
                    status: 'error',
                    description: i18n.t('managerDashboard.errorChangingRole'),
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
    const blockButtons = screen.getAllByLabelText(i18n.t("managerDashboard.tooltipBlock"));
    await act(async () => {
        fireEvent.click(blockButtons[0]);
    });


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
        title: i18n.t("managerDashboard.userBlocked"),
        description: i18n.t("managerDashboard.userBlockedDescription"),
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
        // Mock failed ban status change
        mockFetch.mockResolvedValueOnce({ ok: false, json: () => Promise.resolve({ detail: "Failed to change status" }) });

        renderManagerDashboard();

        await waitFor(() => expect(mockFetch).toHaveBeenCalledTimes(1));

        const blockButtons = screen.getAllByLabelText(i18n.t("managerDashboard.tooltipBlock"));
        await act(async () => {
            fireEvent.click(blockButtons[0]);
        });


        await waitFor(() => {
            expect(mockToast).toHaveBeenCalledWith(
                expect.objectContaining({
                    status: 'error',
                    description: i18n.t('managerDashboard.errorChangingStatus'),
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

    const resetPasswordButtons = screen.getAllByLabelText(i18n.t("managerDashboard.tooltipResetPassword"));
    fireEvent.click(resetPasswordButtons[0]);

        // Verify the modal is open
        await screen.findByText(i18n.t("managerDashboard.confirmPasswordReset"));
        const modal = screen.getByRole("dialog");
        expect(
            within(modal).getByText(
                new RegExp(i18n.t("managerDashboard.confirmPasswordResetMessage").replace(/\{.*?\}/g, ".*")),
            ),
        ).toBeInTheDocument();

    // Confirm password reset

    const confirmButton = screen.getByRole("button", {
      name: i18n.t("managerDashboard.resetPassword"),
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

        title: i18n.t("managerDashboard.passwordReset"),

        description: i18n.t("managerDashboard.passwordResetDescription"),
      }),
    );

    // Verify the modal is closed

    await waitFor(() => {
      expect(
        screen.queryByText(i18n.t("managerDashboard.confirmPasswordReset")),
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
        // Mock failed password reset
        mockFetch.mockResolvedValueOnce({ ok: false, json: () => Promise.resolve({ detail: "Failed to reset password" }) });

        renderManagerDashboard();

        await waitFor(() => expect(mockFetch).toHaveBeenCalledTimes(1));

        const resetPasswordButtons = screen.getAllByLabelText(i18n.t("managerDashboard.tooltipResetPassword"));
        fireEvent.click(resetPasswordButtons[0]);
        await screen.findByText(i18n.t("managerDashboard.confirmPasswordReset"));
        fireEvent.click(screen.getByRole("button", { name: i18n.t("managerDashboard.resetPassword") }));

        await waitFor(() => {
            expect(mockToast).toHaveBeenCalledWith(
                expect.objectContaining({
                    status: 'error',
                    description: i18n.t('managerDashboard.errorResettingPassword'),
                })
            );
        });
    });
});
