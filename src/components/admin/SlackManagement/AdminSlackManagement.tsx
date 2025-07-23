import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Slack, 
  CheckCircle, 
  AlertCircle, 
  Settings, 
  Bell, 
  ExternalLink, 
  Loader2,
  Building2,
  Users,
  Hash,
  X
} from 'lucide-react';
import { 
  generateAdminSlackOAuthURL,
  getAdminSlackConnectionStatus,
  fetchAdminSlackChannels,
  assignCompanySlackChannel,
  testCompanySlackNotification,
  disconnectAdminSlack,
  getCompanySlackChannel,
  removeCompanySlackChannel,
  AdminSlackConnectionStatus,
  CompanySlackSettings,
  SlackChannel
} from '../../../lib/adminSlackService';
import { BaseModal } from '../../ui/BaseModal';

interface AdminSlackManagementProps {
  isOpen: boolean;
  onClose: () => void;
  companyName?: string;
  companyId?: string;
}

export function AdminSlackManagement({ 
  isOpen, 
  onClose, 
  companyName,
  companyId 
}: AdminSlackManagementProps) {
  const [connectionStatus, setConnectionStatus] = useState<AdminSlackConnectionStatus>({ connected: false });
  const [channels, setChannels] = useState<SlackChannel[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState('');
  const [selectedChannel, setSelectedChannel] = useState('');
  const [testResult, setTestResult] = useState<{ success?: boolean; error?: string } | null>(null);
  const [assignedChannel, setAssignedChannel] = useState<CompanySlackSettings | null>(null);

  // Load connection status, channels, and current assignment
  const loadConnectionStatus = async () => {
    try {
      setLoading(true);
      const status = await getAdminSlackConnectionStatus();
      setConnectionStatus(status);

      if (status.connected) {
        const channelsResult = await fetchAdminSlackChannels();
        if (channelsResult.success && channelsResult.channels) {
          setChannels(channelsResult.channels);
        }
      }

      // Load current channel assignment for this company
      if (companyId) {
        const currentAssignment = await getCompanySlackChannel(companyId);
        setAssignedChannel(currentAssignment);
      }
    } catch (error) {
      console.error('Error loading admin Slack connection status:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      loadConnectionStatus();
    }
  }, [isOpen]);

  const handleConnect = async () => {
    setActionLoading('connecting');
    try {
      const oauthUrl = generateAdminSlackOAuthURL();
      window.location.href = oauthUrl;
    } catch (error) {
      console.error('Error initiating admin Slack OAuth:', error);
      setTestResult({ error: 'Failed to initiate Slack connection' });
      setActionLoading('');
    }
  };

  const handleChannelAssignment = async () => {
    if (!selectedChannel || !companyId || !companyName) return;

    setActionLoading('assigning');
    try {
      const channel = channels.find(ch => ch.id === selectedChannel);
      if (!channel) return;

      const success = await assignCompanySlackChannel(companyId, selectedChannel, channel.name);
      if (success) {
        setTestResult({ success: true });
        setSelectedChannel('');
        // Reload the assignment to show updated UI
        const updatedAssignment = await getCompanySlackChannel(companyId);
        setAssignedChannel(updatedAssignment);
        // Optionally close modal after successful assignment
        setTimeout(() => {
          onClose();
        }, 2000);
      } else {
        setTestResult({ error: 'Failed to assign channel to company' });
      }
    } catch (error) {
      console.error('Error assigning Slack channel:', error);
      setTestResult({ error: 'Failed to assign channel to company' });
    } finally {
      setActionLoading('');
    }
  };

  const handleTestNotification = async () => {
    if (!companyId) return;

    console.log('Testing notification for company ID:', companyId);
    setActionLoading('testing');
    setTestResult(null);
    try {
      const result = await testCompanySlackNotification(companyId);
      console.log('Test notification result:', result);
      setTestResult(result);
    } catch (error) {
      console.error('Error sending test notification:', error);
      setTestResult({ error: 'Failed to send test notification' });
    } finally {
      setActionLoading('');
    }
  };

  const handleDisconnect = async () => {
    setActionLoading('disconnecting');
    try {
      const success = await disconnectAdminSlack();
      if (success) {
        setConnectionStatus({ connected: false });
        setChannels([]);
        setSelectedChannel('');
        setAssignedChannel(null);
        setTestResult({ success: true });
      } else {
        setTestResult({ error: 'Failed to disconnect Slack' });
      }
    } catch (error) {
      console.error('Error disconnecting admin Slack:', error);
      setTestResult({ error: 'Failed to disconnect Slack' });
    } finally {
      setActionLoading('');
    }
  };

  const handleRemoveChannelAssignment = async () => {
    if (!companyId) return;

    setActionLoading('removing');
    try {
      const success = await removeCompanySlackChannel(companyId);
      if (success) {
        setAssignedChannel(null);
        setSelectedChannel('');
        setTestResult({ success: true });
      } else {
        setTestResult({ error: 'Failed to remove channel assignment' });
      }
    } catch (error) {
      console.error('Error removing channel assignment:', error);
      setTestResult({ error: 'Failed to remove channel assignment' });
    } finally {
      setActionLoading('');
    }
  };

  if (loading) {
    return (
      <BaseModal isOpen={isOpen} onClose={onClose} title="Slack Integration Management">
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 text-yellow-400 animate-spin" />
        </div>
      </BaseModal>
    );
  }

  return (
    <BaseModal isOpen={isOpen} onClose={onClose} title="Slack Integration Management" theme="dark" size="md">
      <div className="space-y-4">
        {/* Header */}
        <div className="flex items-center gap-3 p-4 bg-gray-800 border border-gray-700 rounded-lg">
          <div className="p-2 bg-gradient-to-br from-purple-500 to-purple-600 rounded-lg">
            <Slack className="w-5 h-5 text-white" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-white">
              {companyName ? `${companyName} - Slack Integration` : 'Admin Slack Management'}
            </h3>
            <p className="text-gray-400 text-sm">
              Manage Slack notifications for client companies
            </p>
          </div>
        </div>

        {!connectionStatus.connected ? (
          /* Not Connected State */
          <div className="space-y-4">
            <div className="text-center py-6">
              <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-blue-600 rounded-xl flex items-center justify-center mx-auto mb-3">
                <Slack className="w-6 h-6 text-white" />
              </div>
              <h4 className="text-lg font-bold text-white mb-2">Super Admin Slack Not Connected</h4>
              <p className="text-gray-400 text-sm">
                Connect your Slack workspace to manage client notifications centrally.
              </p>
            </div>

            <div className="p-4 bg-gray-800 border border-gray-700 rounded-lg">
              <div className="flex items-center gap-2 mb-3">
                <Settings className="w-4 h-4 text-blue-400" />
                <h5 className="text-sm font-bold text-blue-400">How it works:</h5>
              </div>
              <ul className="space-y-2 text-gray-300 text-sm">
                <li className="flex items-start gap-2">
                  <div className="w-1.5 h-1.5 bg-blue-400 rounded-full mt-1.5 flex-shrink-0"></div>
                  <span>Connect once as super admin (lashay@bofu.ai)</span>
                </li>
                <li className="flex items-start gap-2">
                  <div className="w-1.5 h-1.5 bg-purple-400 rounded-full mt-1.5 flex-shrink-0"></div>
                  <span>Assign dedicated channels to each client company</span>
                </li>
                <li className="flex items-start gap-2">
                  <div className="w-1.5 h-1.5 bg-green-400 rounded-full mt-1.5 flex-shrink-0"></div>
                  <span>All client notifications route to their assigned channels</span>
                </li>
                <li className="flex items-start gap-2">
                  <div className="w-1.5 h-1.5 bg-yellow-400 rounded-full mt-1.5 flex-shrink-0"></div>
                  <span>Centralized management and oversight</span>
                </li>
              </ul>
            </div>

            <div className="flex justify-center">
              <button
                onClick={handleConnect}
                disabled={actionLoading === 'connecting'}
                className="px-6 py-3 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold rounded-lg transition-colors"
              >
                <div className="flex items-center gap-2">
                  {actionLoading === 'connecting' ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Slack className="w-4 h-4" />
                  )}
                  <span>Connect Super Admin Slack</span>
                  <ExternalLink className="w-4 h-4" />
                </div>
              </button>
            </div>
          </div>
        ) : (
          /* Connected State */
          <div className="space-y-4">
            {/* Connection Status */}
            <div className="p-4 bg-gray-800 border border-green-500 rounded-lg">
              <div className="flex items-center gap-4">
                <div className="p-2 bg-green-500/20 rounded-lg">
                  <CheckCircle className="w-5 h-5 text-green-400" />
                </div>
                <div className="flex-1">
                  <h4 className="text-base font-bold text-green-400">Super Admin Connected</h4>
                  <p className="text-gray-300 text-sm">Workspace: <span className="font-semibold text-white">{connectionStatus.team_name}</span></p>
                </div>
                <div className="flex items-center gap-2 px-3 py-1 bg-green-500/10 border border-green-500/20 rounded-full">
                  <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                  <span className="text-green-400 font-semibold text-xs">ACTIVE</span>
                </div>
              </div>
            </div>

            {companyName && companyId && (
              <>
                {assignedChannel?.slack_channel_id ? (
                  /* Currently Assigned Channel */
                  <div className="space-y-3">
                    <div className="flex items-center gap-3 p-3 bg-gray-800 rounded-lg border border-green-500">
                      <div className="p-2 bg-green-500/20 rounded-lg">
                        <Hash className="w-4 h-4 text-green-400" />
                      </div>
                      <h4 className="text-base font-bold text-white">Assigned Channel for {companyName}</h4>
                    </div>

                    <div className="p-4 bg-gray-800 rounded-lg border border-gray-700">
                      <div className="space-y-4">
                        <div className="flex items-center gap-3 p-3 bg-green-900/30 border border-green-500/30 rounded-lg">
                          <div className="p-2 bg-green-500/20 rounded-lg">
                            <Hash className="w-4 h-4 text-green-400" />
                          </div>
                          <div className="flex-1">
                            <h5 className="text-base font-bold text-green-400">#{assignedChannel.slack_channel_name}</h5>
                            <p className="text-gray-300 text-sm">
                              Assigned on {new Date(assignedChannel.assigned_at || '').toLocaleDateString()}
                            </p>
                          </div>
                          <div className="flex items-center gap-2 px-3 py-1 bg-green-500/10 border border-green-500/20 rounded-full">
                            <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                            <span className="text-green-400 font-semibold text-xs">ASSIGNED</span>
                          </div>
                        </div>
                        
                        <div className="grid grid-cols-2 gap-3">
                          <button
                            onClick={handleTestNotification}
                            disabled={actionLoading === 'testing'}
                            className="flex items-center justify-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold rounded-lg transition-colors text-sm"
                          >
                            {actionLoading === 'testing' ? (
                              <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                              <Bell className="w-4 h-4" />
                            )}
                            <span>Test</span>
                          </button>

                          <button
                            onClick={handleRemoveChannelAssignment}
                            disabled={actionLoading === 'removing'}
                            className="flex items-center justify-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold rounded-lg transition-colors text-sm"
                          >
                            {actionLoading === 'removing' ? (
                              <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                              <X className="w-4 h-4" />
                            )}
                            <span>Remove</span>
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                ) : (
                  /* Channel Assignment (No Channel Assigned Yet) */
                  <div className="space-y-3">
                    <div className="flex items-center gap-3 p-3 bg-gray-800 rounded-lg border border-blue-500">
                      <div className="p-2 bg-blue-500/20 rounded-lg">
                        <Building2 className="w-4 h-4 text-blue-400" />
                      </div>
                      <h4 className="text-base font-bold text-white">Assign Channel to {companyName}</h4>
                    </div>

                    <div className="p-4 bg-gray-800 rounded-lg border border-gray-700">
                      <div className="space-y-4">
                        <div>
                          <label className="block text-sm font-semibold text-gray-200 mb-2">
                            Select Slack Channel
                          </label>
                          <select
                            value={selectedChannel}
                            onChange={(e) => setSelectedChannel(e.target.value)}
                            className="w-full bg-gray-700 text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 border border-gray-600"
                          >
                            <option value="" className="text-gray-400">Choose a channel for {companyName}...</option>
                            {channels.map((channel) => (
                              <option key={channel.id} value={channel.id} className="text-white">
                                #{channel.name} {channel.is_private ? '(private)' : ''} 
                                {channel.is_member ? '' : ' (bot not added)'}
                              </option>
                            ))}
                          </select>
                        </div>
                        
                        <div className="grid grid-cols-2 gap-3">
                          <button
                            onClick={handleChannelAssignment}
                            disabled={!selectedChannel || actionLoading === 'assigning'}
                            className="flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold rounded-lg transition-colors text-sm"
                          >
                            {actionLoading === 'assigning' ? (
                              <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                              <Hash className="w-4 h-4" />
                            )}
                            <span>Assign</span>
                          </button>

                          <button
                            onClick={handleTestNotification}
                            disabled={actionLoading === 'testing'}
                            className="flex items-center justify-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold rounded-lg transition-colors text-sm"
                          >
                            {actionLoading === 'testing' ? (
                              <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                              <Bell className="w-4 h-4" />
                            )}
                            <span>Test</span>
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </>
            )}

            {/* Admin Controls */}
            <div className="flex justify-between items-center pt-3 border-t border-gray-700">
              <div className="flex items-center gap-2">
                <div className="w-1.5 h-1.5 bg-green-400 rounded-full animate-pulse"></div>
                <span className="text-gray-400 text-sm">
                  Connected as super admin
                </span>
              </div>
              <button
                onClick={handleDisconnect}
                disabled={actionLoading === 'disconnecting'}
                className="flex items-center gap-1 px-3 py-1 bg-red-600/20 hover:bg-red-600/30 text-red-400 hover:text-red-300 rounded-md transition-colors text-sm"
              >
                {actionLoading === 'disconnecting' ? (
                  <Loader2 className="w-3 h-3 animate-spin" />
                ) : (
                  <>
                    <X className="w-3 h-3" />
                    <span>Disconnect</span>
                  </>
                )}
              </button>
            </div>
          </div>
        )}

        {/* Result Messages */}
        {testResult && (
          <div className={`p-3 rounded-lg border transition-all duration-300 ${
            testResult.success 
              ? 'bg-green-900/50 border-green-500' 
              : 'bg-red-900/50 border-red-500'
          }`}>
            <div className="flex items-start gap-3">
              <div className={`p-1.5 rounded-lg ${
                testResult.success ? 'bg-green-500/20' : 'bg-red-500/20'
              }`}>
                {testResult.success ? (
                  <CheckCircle className="w-4 h-4 text-green-400" />
                ) : (
                  <AlertCircle className="w-4 h-4 text-red-400" />
                )}
              </div>
              <div className="flex-1">
                <p className={`text-sm font-bold mb-1 ${testResult.success ? 'text-green-400' : 'text-red-400'}`}>
                  {testResult.success ? 'Success!' : 'Error'}
                </p>
                <p className={`text-xs ${testResult.success ? 'text-green-200' : 'text-red-200'}`}>
                  {testResult.success ? 'Operation completed successfully!' : testResult.error}
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </BaseModal>
  );
}