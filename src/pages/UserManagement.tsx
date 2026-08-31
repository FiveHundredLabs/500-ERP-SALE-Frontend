import React, { useState, useEffect } from "react";
import AppLayout from "../components/AppLayout";
import { UserCog, Plus, Search, Edit2, Trash2, Shield, Package, AlertCircle, MoreVertical } from "lucide-react";
import { Button } from "../components/common/Button";
import { FormField } from "../components/common/FormField";
import { FormInput } from "../components/common/FormInput";
import { FormSelect } from "../components/common/FormSelect";
import { Modal } from "../components/common/Modal";
import UserService from "../services/UserService";
import type { User, CreateUserDto, UpdateUserDto } from "../types/users";
import { useAuth } from "../contexts/AuthContext";

const UserManagement: React.FC = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [showMobileMenu, setShowMobileMenu] = useState(false);
  const [expandedUserId, setExpandedUserId] = useState<string | null>(null);
  const { user: currentUser } = useAuth();

  const [createForm, setCreateForm] = useState<CreateUserDto>({
    fullName: "",
    email: "",
    password: "",
    role: "inventory_manager"
  });

  const [editForm, setEditForm] = useState<UpdateUserDto>({
    fullName: "",
    email: "",
    role: "inventory_manager"
  });

  useEffect(() => {
    fetchUsers();
  }, []);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (showMobileMenu && !(event.target as Element).closest('.mobile-menu')) {
        setShowMobileMenu(false);
      }
    };
    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, [showMobileMenu]);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await UserService.getUsers();
      setUsers(data);
    } catch (err: any) {
      setError(err.message || "Failed to fetch users");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setError(null);
      setSuccess(null);
      
      // Validate form
      if (!createForm.fullName.trim()) {
        throw new Error("Full name is required");
      }
      if (!createForm.email.trim()) {
        throw new Error("Email is required");
      }
      if (!createForm.password || createForm.password.length < 6) {
        throw new Error("Password must be at least 6 characters");
      }

      const newUser = await UserService.createUser(createForm);
      setUsers(prev => [...prev, newUser]);
      setShowCreateModal(false);
      setSuccess("User created successfully!");
      setCreateForm({
        fullName: "",
        email: "",
        password: "",
        role: "inventory_manager"
      });
    } catch (err: any) {
      setError(err.message || "Failed to create user");
    }
  };

  const handleEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUser) return;

    try {
      setError(null);
      setSuccess(null);
      
      if (!editForm.fullName?.trim()) {
        throw new Error("Full name is required");
      }
      if (!editForm.email?.trim()) {
        throw new Error("Email is required");
      }

      const updatedUser = await UserService.updateUser(selectedUser.id, editForm);
      if (updatedUser) {
        setUsers(prev => prev.map(u => u.id === selectedUser.id ? updatedUser : u));
        setShowEditModal(false);
        setSuccess("User updated successfully!");
      }
    } catch (err: any) {
      setError(err.message || "Failed to update user");
    }
  };

  const handleDelete = async () => {
    if (!selectedUser) return;

    try {
      setError(null);
      setSuccess(null);
      
      const success = await UserService.deleteUser(selectedUser.id);
      if (success) {
        setUsers(prev => prev.filter(u => u.id !== selectedUser.id));
        setShowDeleteModal(false);
        setSuccess("User deleted successfully!");
      }
    } catch (err: any) {
      setError(err.message || "Failed to delete user");
    }
  };

  const openEditModal = (user: User) => {
    if (user.role === 'admin' && currentUser?.role !== 'admin') {
      setError("Only admins can edit admin users");
      return;
    }
    
    setSelectedUser(user);
    setEditForm({
      fullName: user.fullName,
      email: user.email,
      role: user.role
    });
    setShowEditModal(true);
    setError(null);
    setExpandedUserId(null);
  };

  const openDeleteModal = (user: User) => {
    if (user.role === 'admin') {
      setError("Cannot delete admin users");
      return;
    }
    
    setSelectedUser(user);
    setShowDeleteModal(true);
    setError(null);
    setExpandedUserId(null);
  };

  const filteredUsers = users.filter(user =>
    user.fullName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.role.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const roleOptions = [
    { value: "admin", label: "Admin" },
    { value: "inventory_manager", label: "Inventory Manager" }
  ];

  const toggleUserExpansion = (userId: string) => {
    setExpandedUserId(expandedUserId === userId ? null : userId);
  };

  return (
    <AppLayout
      headerIcon={<UserCog size={18} />}
      headerTitle="System User Management"
      headerSubtitle="Manage system user accounts, roles, and access controls"
      headerRight={
        <Button
          variant="primary"
          size="sm"
          icon={<Plus className="w-4 h-4" />}
          onClick={() => setShowCreateModal(true)}
        >
          Add User
        </Button>
      }
    >
      <div className="space-y-6">
          {/* Alerts */}
          {error && (
            <div className="mb-4 p-4 bg-red-500/10 border border-red-500/30 rounded-lg flex items-center gap-3">
              <AlertCircle className="w-5 h-5 text-red-400" />
              <p className="text-red-300 text-sm lg:text-base">{error}</p>
            </div>
          )}

          {success && (
            <div className="mb-4 p-4 bg-green-500/10 border border-green-500/30 rounded-lg flex items-center gap-3">
              <AlertCircle className="w-5 h-5 text-green-400" />
              <p className="text-green-300 text-sm lg:text-base">{success}</p>
            </div>
          )}

          {/* Search Bar */}
          <div className="mb-6">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
              <FormInput
                placeholder="Search users by name, email, or role..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 text-sm lg:text-base"
              />
            </div>
          </div>

          {/* Users Table - Desktop */}
          <div className="hidden lg:block bg-[#1e293b]/50 backdrop-blur-sm border border-[#334155] rounded-xl overflow-hidden">
            {loading ? (
              <div className="p-8 text-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto"></div>
                <p className="mt-4 text-gray-400">Loading users...</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-[#334155]">
                      <th className="text-left p-4 text-gray-400 font-medium">Name</th>
                      <th className="text-left p-4 text-gray-400 font-medium">Email</th>
                      <th className="text-left p-4 text-gray-400 font-medium">Role</th>
                      <th className="text-left p-4 text-gray-400 font-medium">Created</th>
                      <th className="text-left p-4 text-gray-400 font-medium">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredUsers.map((user) => (
                      <tr key={user.id} className="border-b border-[#334155]/50 hover:bg-[#334155]/20">
                        <td className="p-4">
                          <div className="flex items-center gap-3">
                            <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                              user.role === 'admin' 
                                ? 'bg-purple-500/20' 
                                : 'bg-blue-500/20'
                            }`}>
                              {user.role === 'admin' ? (
                                <Shield className="w-4 h-4 text-purple-400" />
                              ) : (
                                <Package className="w-4 h-4 text-blue-400" />
                              )}
                            </div>
                            <span className="font-medium">{user.fullName}</span>
                          </div>
                        </td>
                        <td className="p-4 text-gray-300">{user.email}</td>
                        <td className="p-4">
                          <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                            user.role === 'admin'
                              ? 'bg-purple-500/20 text-purple-300'
                              : 'bg-blue-500/20 text-blue-300'
                          }`}>
                            {user.role === 'admin' ? 'Admin' : 'Inventory Manager'}
                          </span>
                        </td>
                        <td className="p-4 text-gray-400 text-sm">
                          {user.createdAt ? new Date(user.createdAt).toLocaleDateString() : 'N/A'}
                        </td>
                        <td className="p-4">
                          <div className="flex items-center gap-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              icon={<Edit2 className="w-3 h-3" />}
                              onClick={() => openEditModal(user)}
                              disabled={user.role === 'admin' && currentUser?.role !== 'admin'}
                              title={user.role === 'admin' && currentUser?.role !== 'admin' ? "Only admins can edit admin users" : "Edit user"}
                            >
                              Edit
                            </Button>
                            <Button
                              variant="danger"
                              size="sm"
                              icon={<Trash2 className="w-3 h-3" />}
                              onClick={() => openDeleteModal(user)}
                              disabled={user.role === 'admin'}
                              title={user.role === 'admin' ? "Cannot delete admin users" : "Delete user"}
                            >
                              Delete
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                
                {filteredUsers.length === 0 && (
                  <div className="p-8 text-center text-gray-400">
                    <UserCog className="w-12 h-12 mx-auto mb-4 opacity-50" />
                    <p>No users found</p>
                    {searchTerm && <p className="text-sm mt-2">Try adjusting your search term</p>}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Mobile Users List */}
          <div className="lg:hidden space-y-4">
            {loading ? (
              <div className="p-8 text-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto"></div>
                <p className="mt-4 text-gray-400">Loading users...</p>
              </div>
            ) : (
              <div className="space-y-4">
                {filteredUsers.map((user) => (
                  <div
                    key={user.id}
                    className="bg-[#1e293b]/50 backdrop-blur-sm border border-[#334155] rounded-xl overflow-hidden"
                  >
                    <div 
                      className="p-4 flex items-center justify-between cursor-pointer hover:bg-[#334155]/20"
                      onClick={() => toggleUserExpansion(user.id)}
                    >
                      <div className="flex items-center gap-3">
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                          user.role === 'admin' 
                            ? 'bg-purple-500/20' 
                            : 'bg-blue-500/20'
                        }`}>
                          {user.role === 'admin' ? (
                            <Shield className="w-5 h-5 text-purple-400" />
                          ) : (
                            <Package className="w-5 h-5 text-blue-400" />
                          )}
                        </div>
                        <div>
                          <h3 className="font-medium text-gray-200">{user.fullName}</h3>
                          <p className="text-sm text-gray-400">{user.email}</p>
                          <span className={`mt-1 inline-block px-2 py-1 rounded-full text-xs font-medium ${
                            user.role === 'admin'
                              ? 'bg-purple-500/20 text-purple-300'
                              : 'bg-blue-500/20 text-blue-300'
                          }`}>
                            {user.role === 'admin' ? 'Admin' : 'Inventory Manager'}
                          </span>
                        </div>
                      </div>
                      <MoreVertical className={`w-5 h-5 text-gray-400 transition-transform ${
                        expandedUserId === user.id ? 'rotate-90' : ''
                      }`} />
                    </div>

                    {/* Expanded Details */}
                    {expandedUserId === user.id && (
                      <div className="px-4 pb-4 border-t border-[#334155]/50 pt-4">
                        <div className="grid grid-cols-2 gap-4 text-sm">
                          <div>
                            <p className="text-gray-400">Created</p>
                            <p className="text-gray-300">
                              {user.createdAt ? new Date(user.createdAt).toLocaleDateString() : 'N/A'}
                            </p>
                          </div>
                          <div>
                            <p className="text-gray-400">Status</p>
                            <p className="text-gray-300">Active</p>
                          </div>
                        </div>
                        
                        <div className="flex gap-2 mt-4">
                          <Button
                            variant="ghost"
                            size="sm"
                            icon={<Edit2 className="w-3 h-3" />}
                            onClick={(e) => {
                              e.stopPropagation();
                              openEditModal(user);
                            }}
                            disabled={user.role === 'admin' && currentUser?.role !== 'admin'}
                            className="flex-1"
                          >
                            Edit
                          </Button>
                          <Button
                            variant="danger"
                            size="sm"
                            icon={<Trash2 className="w-3 h-3" />}
                            onClick={(e) => {
                              e.stopPropagation();
                              openDeleteModal(user);
                            }}
                            disabled={user.role === 'admin'}
                            className="flex-1"
                          >
                            Delete
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>
                ))}

                {filteredUsers.length === 0 && (
                  <div className="p-8 text-center text-gray-400 bg-[#1e293b]/50 backdrop-blur-sm border border-[#334155] rounded-xl">
                    <UserCog className="w-12 h-12 mx-auto mb-4 opacity-50" />
                    <p>No users found</p>
                    {searchTerm && <p className="text-sm mt-2">Try adjusting your search term</p>}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

      {/* Create User Modal */}
      <Modal
        isOpen={showCreateModal}
        onClose={() => {
          setShowCreateModal(false);
          setError(null);
        }}
        title="Create New User"
      >
        <form onSubmit={handleCreate} className="space-y-4">
          <FormField label="Full Name" required>
            <FormInput
              value={createForm.fullName}
              onChange={(e) => setCreateForm({...createForm, fullName: e.target.value})}
              placeholder="Enter full name"
              required
            />
          </FormField>

          <FormField label="Email" required>
            <FormInput
              type="email"
              value={createForm.email}
              onChange={(e) => setCreateForm({...createForm, email: e.target.value})}
              placeholder="Enter email"
              required
            />
          </FormField>

          <FormField label="Password" required>
            <FormInput
              type="password"
              value={createForm.password}
              onChange={(e) => setCreateForm({...createForm, password: e.target.value})}
              placeholder="Enter password (min. 6 characters)"
              required
              minLength={6}
            />
          </FormField>

          <FormField label="Role" required>
            <FormSelect
              options={roleOptions}
              value={createForm.role}
              onChange={(e) => setCreateForm({...createForm, role: e.target.value as User['role']})}
            />
          </FormField>

          <div className="flex flex-col sm:flex-row justify-end gap-3 pt-4 border-t border-[#334155]">
            <Button
              type="button"
              variant="secondary"
              onClick={() => setShowCreateModal(false)}
              className="w-full sm:w-auto"
            >
              Cancel
            </Button>
            <Button type="submit" variant="primary" className="w-full sm:w-auto">
              Create User
            </Button>
          </div>
        </form>
      </Modal>

      {/* Edit User Modal */}
      <Modal
        isOpen={showEditModal}
        onClose={() => {
          setShowEditModal(false);
          setError(null);
        }}
        title="Edit User"
      >
        <form onSubmit={handleEdit} className="space-y-4">
          <FormField label="Full Name" required>
            <FormInput
              value={editForm.fullName || ''}
              onChange={(e) => setEditForm({...editForm, fullName: e.target.value})}
              placeholder="Enter full name"
              required
            />
          </FormField>

          <FormField label="Email" required>
            <FormInput
              type="email"
              value={editForm.email || ''}
              onChange={(e) => setEditForm({...editForm, email: e.target.value})}
              placeholder="Enter email"
              required
            />
          </FormField>

          <FormField label="Role" required>
            <FormSelect
              options={roleOptions}
              value={editForm.role || 'inventory_manager'}
              onChange={(e) => setEditForm({...editForm, role: e.target.value as User['role']})}
              disabled={selectedUser?.role === 'admin' && currentUser?.role !== 'admin'}
            />
          </FormField>

          <div className="flex flex-col sm:flex-row justify-end gap-3 pt-4 border-t border-[#334155]">
            <Button
              type="button"
              variant="secondary"
              onClick={() => setShowEditModal(false)}
              className="w-full sm:w-auto"
            >
              Cancel
            </Button>
            <Button type="submit" variant="primary" className="w-full sm:w-auto">
              Update User
            </Button>
          </div>
        </form>
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={showDeleteModal}
        onClose={() => setShowDeleteModal(false)}
        title="Confirm Delete"
        size="sm"
      >
        <div className="space-y-4">
          <div className="p-4 bg-red-500/10 border border-red-500/30 rounded-lg">
            <div className="flex items-center gap-3">
              <AlertCircle className="w-5 h-5 text-red-400" />
              <p className="text-red-300 text-sm lg:text-base">
                Are you sure you want to delete <strong>{selectedUser?.fullName}</strong>?
              </p>
            </div>
          </div>
          
          <p className="text-gray-400 text-sm lg:text-base">
            This action cannot be undone. The user will be permanently removed from the system.
          </p>

          <div className="flex flex-col sm:flex-row justify-end gap-3 pt-4 border-t border-[#334155]">
            <Button
              type="button"
              variant="secondary"
              onClick={() => setShowDeleteModal(false)}
              className="w-full sm:w-auto"
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="danger"
              onClick={handleDelete}
              className="w-full sm:w-auto"
            >
              Delete
            </Button>
          </div>
        </div>
      </Modal>
    </AppLayout>
  );
};

export default UserManagement;