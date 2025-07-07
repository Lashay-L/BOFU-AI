import React, { useState } from 'react';
import { toast } from 'react-hot-toast';
import { 
  KeyRound, 
  AlertTriangle, 
  Eye, 
  EyeOff, 
  Loader2 
} from 'lucide-react';
import { BaseModal } from '../../ui/BaseModal';

// Types for the modal
interface UserProfile {
  id: string;
  email: string;
  company_name: string;
  avatar_url?: string;
  created_at: string;
  updated_at: string;
  user_type?: 'main' | 'sub';
  profile_role?: 'admin' | 'manager' | 'editor' | 'viewer';
  parent_user_id?: string;
  profile_name?: string;
  articleCount?: number;
}

interface AdminDirectPasswordChangeModalProps {
  isOpen: boolean;
  user: UserProfile | null;
  onClose: () => void;
  onPasswordChange: (user: UserProfile, newPassword: string) => Promise<boolean>;
}

export const AdminDirectPasswordChangeModal = ({ 
  isOpen, 
  user, 
  onClose, 
  onPasswordChange 
}: AdminDirectPasswordChangeModalProps) => {
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isChanging, setIsChanging] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!newPassword || !confirmPassword) {
      toast.error('Please fill in all fields');
      return;
    }

    if (newPassword !== confirmPassword) {
      toast.error('Passwords do not match');
      return;
    }

    if (newPassword.length < 8) {
      toast.error('Password must be at least 8 characters long');
      return;
    }

    if (!user) return;

    setIsChanging(true);
    const success = await onPasswordChange(user, newPassword);
    setIsChanging(false);

    if (success) {
      setNewPassword('');
      setConfirmPassword('');
      onClose();
    }
  };

  const handleClose = () => {
    setNewPassword('');
    setConfirmPassword('');
    onClose();
  };

  const generateSecurePassword = () => {
    const charset = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*';
    let password = '';
    for (let i = 0; i < 12; i++) {
      password += charset.charAt(Math.floor(Math.random() * charset.length));
    }
    setNewPassword(password);
    setConfirmPassword(password);
  };

  if (!user) return null;

  return (
    <BaseModal
      isOpen={isOpen}
      onClose={handleClose}
      title="Change Password"
      size="md"
      theme="dark"
    >
      {/* Icon and user info */}
      <div className="flex items-center gap-3 mb-6">
        <div className="p-2 bg-orange-500/20 rounded-lg">
          <KeyRound className="h-5 w-5 text-orange-400" />
        </div>
        <div>
          <p className="text-sm text-gray-400">{user.email}</p>
        </div>
      </div>

      {/* Warning */}
      <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-lg p-4 mb-6">
        <div className="flex items-start gap-3">
          <AlertTriangle className="h-5 w-5 text-yellow-400 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm text-yellow-300 font-medium">Direct Password Change</p>
            <p className="text-xs text-yellow-200/80 mt-1">
              This will immediately change the user's password. The user will need to use the new password to log in.
            </p>
          </div>
        </div>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">
            New Password
          </label>
          <div className="relative">
            <input
              type={showPassword ? 'text' : 'password'}
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              className="w-full px-4 py-3 bg-gray-700/50 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-orange-500/50 focus:border-orange-500"
              placeholder="Enter new password"
              required
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-300"
            >
              {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">
            Confirm Password
          </label>
          <input
            type={showPassword ? 'text' : 'password'}
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            className="w-full px-4 py-3 bg-gray-700/50 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-orange-500/50 focus:border-orange-500"
            placeholder="Confirm new password"
            required
          />
        </div>

        <button
          type="button"
          onClick={generateSecurePassword}
          className="w-full px-4 py-2 bg-gray-600/50 hover:bg-gray-600/70 text-gray-300 rounded-lg text-sm font-medium transition-colors border border-gray-600/50 hover:border-gray-500/50"
        >
          Generate Secure Password
        </button>

        <div className="flex gap-3 pt-4">
          <button
            type="button"
            onClick={handleClose}
            className="flex-1 px-4 py-3 bg-gray-600/50 hover:bg-gray-600/70 text-gray-300 rounded-lg font-medium transition-colors"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={isChanging}
            className="flex-1 px-4 py-3 bg-orange-500 hover:bg-orange-600 disabled:bg-orange-500/50 text-white rounded-lg font-medium transition-colors disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {isChanging ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Changing...
              </>
            ) : (
              'Change Password'
            )}
          </button>
        </div>
      </form>
    </BaseModal>
  );
}; 