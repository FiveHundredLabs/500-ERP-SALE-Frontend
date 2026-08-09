import type { User, CreateUserDto, UpdateUserDto } from "../types/users";

const mockSystemUsers: User[] = [
  {
    _id: "usr-admin-001",
    fullName: "Admin User",
    email: "500labs.admin@gmail.com",
    role: "admin",
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z"
  },
  {
    _id: "usr-sales-001",
    fullName: "Kamal Perera",
    email: "kamal@500core.lk",
    role: "salesman",
    createdAt: "2026-01-10T00:00:00.000Z",
    updatedAt: "2026-01-10T00:00:00.000Z"
  },
  {
    _id: "usr-inv-001",
    fullName: "Nimal Silva",
    email: "nimal@500core.lk",
    role: "inventory_manager",
    createdAt: "2026-01-15T00:00:00.000Z",
    updatedAt: "2026-01-15T00:00:00.000Z"
  }
];

class UserService {
  private currentUser: User | null = null;

  setCurrentUser(user: User | null) {
    this.currentUser = user;
  }

  getCurrentUser(): User | null {
    return this.currentUser;
  }

  async getUsers(): Promise<User[]> {
    return [...mockSystemUsers];
  }

  async getUserById(id: string): Promise<User | null> {
    const user = mockSystemUsers.find(u => u._id === id);
    return user || null;
  }

  async createUser(dto: CreateUserDto): Promise<User> {
    const newUser: User = {
      _id: `usr-${Date.now()}`,
      fullName: dto.fullName,
      email: dto.email,
      role: dto.role,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    mockSystemUsers.push(newUser);
    return newUser;
  }

  async updateUser(id: string, dto: UpdateUserDto): Promise<User | null> {
    const user = mockSystemUsers.find(u => u._id === id);
    if (user) {
      if (dto.fullName) user.fullName = dto.fullName;
      if (dto.email) user.email = dto.email;
      if (dto.role) user.role = dto.role;
      user.updatedAt = new Date().toISOString();
      return user;
    }
    return null;
  }

  async deleteUser(id: string): Promise<boolean> {
    const index = mockSystemUsers.findIndex(u => u._id === id);
    if (index !== -1) {
      mockSystemUsers.splice(index, 1);
    }
    return true;
  }

  async checkEmailExists(email: string, excludeId?: string): Promise<boolean> {
    return mockSystemUsers.some(user => 
      user.email.toLowerCase() === email.toLowerCase() && 
      (!excludeId || user._id !== excludeId)
    );
  }
}

export default new UserService();