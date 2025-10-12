import React, { useState, useEffect } from 'react';
import type { User } from '../types';
import { FARM_NAMES } from '../constants';

interface UserManagementProps {
    users: User[];
    onAddUser: (newUser: Omit<User, 'id'>) => void;
    onUpdateUser: (updatedUser: User) => void;
    onDeleteUser: (userId: string) => void;
    onBack: () => void;
}

const BackArrowIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-6 w-6"><line x1="19" y1="12" x2="5" y2="12"></line><polyline points="12 19 5 12 12 5"></polyline></svg>
);

const UserFormModal = ({
    isOpen,
    onClose,
    onSubmit,
    existingUser,
    allUsers
}: {
    isOpen: boolean,
    onClose: () => void,
    onSubmit: (user: User | Omit<User, 'id'>) => void,
    existingUser: User | null,
    allUsers: User[],
}) => {
    if (!isOpen) return null;

    const [user, setUser] = useState<Partial<User>>({
        name: existingUser?.name || '',
        username: existingUser?.username || '',
        password: '',
        role: existingUser?.role || 'Leadman',
        authorizedFarms: existingUser?.authorizedFarms || [],
        contactNumber: existingUser?.contactNumber || '',
    });
    const [errors, setErrors] = useState<{ [key: string]: string }>({});

    useEffect(() => {
        setUser({
            name: existingUser?.name || '',
            username: existingUser?.username || '',
            password: '',
            role: existingUser?.role || 'Leadman',
            authorizedFarms: existingUser?.authorizedFarms || [],
            contactNumber: existingUser?.contactNumber || '',
        });
        setErrors({});
    }, [existingUser, isOpen]);
    
    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement | HTMLSelectElement>) => {
        if (!['ArrowUp', 'ArrowDown'].includes(e.key)) return;
        if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
            e.preventDefault();
            const form = (e.currentTarget as HTMLElement).closest('form');
            if (!form) return;

            const focusable = Array.from(form.querySelectorAll<HTMLElement>('input:not([disabled]), select:not([disabled])'));
            const currentIndex = focusable.indexOf(e.currentTarget as HTMLElement);
            
            let nextIndex = -1;
            if (e.key === 'ArrowDown') {
                nextIndex = (currentIndex + 1) % focusable.length;
            } else { // ArrowUp
                nextIndex = (currentIndex - 1 + focusable.length) % focusable.length;
            }

            if (nextIndex !== -1) {
                focusable[nextIndex]?.focus();
            }
        }
    };

    const validate = () => {
        const newErrors: { [key: string]: string } = {};
        if (!user.name?.trim()) newErrors.name = "Name is required";
        if (!user.username?.trim()) {
            newErrors.username = "Username is required";
        } else {
            const isUsernameTaken = allUsers.some(u => 
                u.username.toLowerCase() === user.username?.toLowerCase() && u.id !== existingUser?.id
            );
            if (isUsernameTaken) newErrors.username = "Username is already taken";
        }
        if (!existingUser && !user.password?.trim()) { // Password is required for new users
             newErrors.password = "Password is required for new users";
        }
        if (!user.role) newErrors.role = "Role is required";
        if (user.role === 'Leadman' && user.authorizedFarms?.length !== 1) {
            newErrors.authorizedFarms = "Leadman must be assigned to exactly one farm.";
        }
        if (user.role === 'Supervisor' && user.authorizedFarms?.length === 0) {
            newErrors.authorizedFarms = "Supervisor must be assigned to at least one farm.";
        }
        if (user.role === 'Admin') {
            user.authorizedFarms = FARM_NAMES; // Admins always have all farms
        }

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!validate()) return;
        
        const userToSubmit = { ...user };
        // If password is not changed, don't include it in update payload
        if (existingUser && !user.password) {
            delete userToSubmit.password;
        }

        onSubmit(existingUser ? { ...existingUser, ...userToSubmit } : userToSubmit as Omit<User, 'id'>);
    };

    const handleFarmToggle = (farmName: string) => {
        setUser(prev => {
            if (prev.role === 'Leadman') {
                return { ...prev, authorizedFarms: [farmName] };
            }
            const newFarms = prev.authorizedFarms?.includes(farmName)
                ? prev.authorizedFarms.filter(f => f !== farmName)
                : [...(prev.authorizedFarms || []), farmName];
            return { ...prev, authorizedFarms: newFarms };
        });
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50 p-4" onClick={onClose}>
            <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-lg" onClick={e => e.stopPropagation()}>
                <form onSubmit={handleSubmit}>
                    <h3 className="text-lg font-semibold text-gray-800">{existingUser ? 'Edit User' : 'Add New User'}</h3>
                    <div className="mt-4 space-y-4 max-h-[70vh] overflow-y-auto pr-2">
                        <div>
                          <label htmlFor="name" className="block text-sm font-medium text-gray-700">Name</label>
                          <input type="text" name="name" id="name" value={user.name} onKeyDown={handleKeyDown} onChange={e => setUser({...user, name: e.target.value})} className={`mt-1 w-full px-3 py-2 border rounded-md ${errors.name ? 'border-red-500' : 'border-gray-300'}`} />
                          {errors.name && <p className="mt-1 text-sm text-red-600">{errors.name}</p>}
                        </div>
                        <div>
                          <label htmlFor="username" className="block text-sm font-medium text-gray-700">Username</label>
                          <input type="text" name="username" id="username" value={user.username} onKeyDown={handleKeyDown} onChange={e => setUser({...user, username: e.target.value})} className={`mt-1 w-full px-3 py-2 border rounded-md ${errors.username ? 'border-red-500' : 'border-gray-300'}`} />
                          {errors.username && <p className="mt-1 text-sm text-red-600">{errors.username}</p>}
                        </div>
                        <div>
                          <label htmlFor="password" className="block text-sm font-medium text-gray-700">Password</label>
                          <input type="password" name="password" id="password" value={user.password} onKeyDown={handleKeyDown} onChange={e => setUser({...user, password: e.target.value})} placeholder={existingUser ? "Leave blank to keep unchanged" : ""} className={`mt-1 w-full px-3 py-2 border rounded-md ${errors.password ? 'border-red-500' : 'border-gray-300'}`} />
                          {errors.password && <p className="mt-1 text-sm text-red-600">{errors.password}</p>}
                        </div>
                        <div>
                          <label htmlFor="role" className="block text-sm font-medium text-gray-700">Role</label>
                          <select name="role" id="role" value={user.role} onKeyDown={handleKeyDown} onChange={e => setUser({...user, role: e.target.value as User['role']})} className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-md">
                            <option value="Admin">Admin</option>
                            <option value="Supervisor">Supervisor</option>
                            <option value="Leadman">Leadman</option>
                          </select>
                        </div>
                        <div>
                          <label htmlFor="contactNumber" className="block text-sm font-medium text-gray-700">Contact Number (Optional)</label>
                          <input type="text" name="contactNumber" id="contactNumber" value={user.contactNumber} onKeyDown={handleKeyDown} onChange={e => setUser({...user, contactNumber: e.target.value})} className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-md" />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700">Authorized Farms</label>
                            {user.role === 'Admin' ? (
                                <p className="text-sm text-gray-600 mt-2 p-2 bg-gray-100 rounded-md">Admins have access to all farms automatically.</p>
                            ) : (
                                <div className="mt-2 grid grid-cols-2 sm:grid-cols-3 gap-2 p-2 border rounded-md">
                                    {FARM_NAMES.map(farm => (
                                        <label key={farm} className="flex items-center text-sm">
                                            <input
                                                type={user.role === 'Leadman' ? 'radio' : 'checkbox'}
                                                checked={user.authorizedFarms?.includes(farm)}
                                                onChange={() => handleFarmToggle(farm)}
                                                name="authorizedFarms"
                                                className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                                            />
                                            <span className="ml-2 text-gray-800">{farm}</span>
                                        </label>
                                    ))}
                                </div>
                            )}
                            {errors.authorizedFarms && <p className="mt-1 text-sm text-red-600">{errors.authorizedFarms}</p>}
                        </div>
                    </div>
                    <div className="mt-6 flex justify-end gap-3">
                        <button type="button" onClick={onClose} className="px-4 py-2 bg-gray-200 text-gray-800 font-semibold rounded-lg">Cancel</button>
                        <button type="submit" className="px-4 py-2 bg-blue-600 text-white font-semibold rounded-lg">{existingUser ? 'Save Changes' : 'Add User'}</button>
                    </div>
                </form>
            </div>
        </div>
    );
};

const UserManagement: React.FC<UserManagementProps> = ({ users, onAddUser, onUpdateUser, onDeleteUser, onBack }) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [deletingUser, setDeletingUser] = useState<User | null>(null);

  const handleOpenModal = (user: User | null = null) => {
    setEditingUser(user);
    setIsModalOpen(true);
  };
  
  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingUser(null);
  };

  const handleSubmit = (user: User | Omit<User, 'id'>) => {
    if ('id' in user) {
        onUpdateUser(user);
    } else {
        onAddUser(user);
    }
    handleCloseModal();
  };

  const handleDelete = () => {
    if (deletingUser) {
        onDeleteUser(deletingUser.id);
        setDeletingUser(null);
    }
  };

  return (
    <>
      <div className="bg-white p-6 rounded-lg shadow-md">
        <div className="flex justify-between items-center mb-6 border-b pb-4">
            <div className="flex items-center gap-4">
                <button type="button" onClick={onBack} className="p-1 rounded-full text-gray-500 hover:bg-gray-200 hover:text-gray-800 transition-colors" aria-label="Go back to dashboard">
                    <BackArrowIcon />
                </button>
                <h3 className="text-xl font-semibold text-gray-800">User Management</h3>
            </div>
          <button onClick={() => handleOpenModal()} className="px-4 py-2 bg-green-600 text-white font-semibold rounded-lg shadow-sm hover:bg-green-700">
            Add New User
          </button>
        </div>
        <div className="max-h-96 overflow-y-auto">
            <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50 sticky top-0">
                    <tr>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Name</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Username</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Role</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Authorized Farms</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
                    </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                    {users.map(user => (
                        <tr key={user.id}>
                            <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-gray-900">{user.name}</td>
                            <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-600">{user.username}</td>
                            <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-600">{user.role}</td>
                            <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-600">
                                {user.authorizedFarms.length === FARM_NAMES.length ? 'All Farms' : user.authorizedFarms.join(', ')}
                            </td>
                            <td className="px-4 py-3 whitespace-nowrap text-sm font-medium space-x-2">
                                <button onClick={() => handleOpenModal(user)} className="text-blue-600 hover:text-blue-800">Edit</button>
                                <button onClick={() => setDeletingUser(user)} className="text-red-600 hover:text-red-800">Delete</button>
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
      </div>
      <UserFormModal 
        isOpen={isModalOpen} 
        onClose={handleCloseModal}
        onSubmit={handleSubmit}
        existingUser={editingUser}
        allUsers={users}
      />
      {deletingUser && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50 p-4" onClick={() => setDeletingUser(null)}>
            <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-sm" onClick={e => e.stopPropagation()}>
                <h3 className="text-lg font-semibold text-gray-800">Confirm Deletion</h3>
                <p className="mt-2 text-gray-700">Are you sure you want to delete the user <span className="font-bold">{deletingUser.name}</span>? This action cannot be undone.</p>
                <div className="mt-6 flex justify-end gap-3">
                    <button onClick={() => setDeletingUser(null)} className="px-4 py-2 bg-gray-200 text-gray-800 font-semibold rounded-lg">Cancel</button>
                    <button onClick={handleDelete} className="px-4 py-2 bg-red-600 text-white font-semibold rounded-lg">Delete</button>
                </div>
            </div>
        </div>
      )}
    </>
  );
};

export default UserManagement;