import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import toast from 'react-hot-toast';

interface UserProfile {
  id: string;
  email: string;
  user_name: string | null;
  company_name: string | null;
  created_at: string;
}

export function UserNameManager() {
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingUser, setEditingUser] = useState<string | null>(null);
  const [editName, setEditName] = useState('');

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('user_profiles')
        .select('id, email, user_name, company_name, created_at')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setUsers(data || []);
    } catch (error) {
      console.error('Error fetching users:', error);
      toast.error('Failed to fetch users');
    } finally {
      setLoading(false);
    }
  };

  const handleEditName = (userId: string, currentName: string | null) => {
    setEditingUser(userId);
    setEditName(currentName || '');
  };

  const handleSaveName = async (userId: string) => {
    try {
      const { error } = await supabase
        .from('user_profiles')
        .update({ user_name: editName.trim() || null })
        .eq('id', userId);

      if (error) throw error;

      setUsers(users.map(user => 
        user.id === userId ? { ...user, user_name: editName.trim() || null } : user
      ));
      
      setEditingUser(null);
      setEditName('');
      toast.success('User name updated successfully');
    } catch (error) {
      console.error('Error updating user name:', error);
      toast.error('Failed to update user name');
    }
  };

  const handleCancel = () => {
    setEditingUser(null);
    setEditName('');
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto p-6 bg-white rounded-lg shadow-lg">
      <h2 className="text-2xl font-bold text-gray-800 mb-6">User Name Management</h2>
      
      <div className="overflow-x-auto">
        <table className="min-w-full bg-white">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Email
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                User Name
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Company
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Created
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {users.map((user) => (
              <tr key={user.id}>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  {user.email}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  {editingUser === user.id ? (
                    <input
                      type="text"
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      className="border border-gray-300 rounded px-3 py-1 text-sm w-full"
                      placeholder="Enter user name"
                      autoFocus
                    />
                  ) : (
                    <span className={user.user_name ? 'text-gray-900' : 'text-gray-400 italic'}>
                      {user.user_name || 'No name set'}
                    </span>
                  )}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  {user.company_name || '-'}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {new Date(user.created_at).toLocaleDateString()}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                  {editingUser === user.id ? (
                    <div className="flex space-x-2">
                      <button
                        onClick={() => handleSaveName(user.id)}
                        className="text-green-600 hover:text-green-900"
                      >
                        Save
                      </button>
                      <button
                        onClick={handleCancel}
                        className="text-gray-600 hover:text-gray-900"
                      >
                        Cancel
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => handleEditName(user.id, user.user_name)}
                      className="text-blue-600 hover:text-blue-900"
                    >
                      Edit Name
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {users.length === 0 && (
        <div className="text-center py-8 text-gray-500">
          No users found
        </div>
      )}
    </div>
  );
}