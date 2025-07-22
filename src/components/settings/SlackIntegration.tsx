import React, { useState, useEffect } from 'react';
import { Loader2, Slack, CheckCircle, AlertCircle, ExternalLink, Settings, Bell, BellOff } from 'lucide-react';
import { 
  generateSlackOAuthURL,
  getSlackConnectionStatus,
  fetchSlackChannels,
  updateSlackChannel,
  toggleSlackNotifications,
  disconnectSlack,
  sendTestSlackNotification,
  checkSlackOAuthResult,
  SlackChannel,
  SlackConnectionStatus
} from '../../lib/slackService';
import { useAuth } from '../../lib/auth';

interface SlackIntegrationProps {
  className?: string;
}

export default function SlackIntegration({ className = '' }: SlackIntegrationProps) {
  const { user } = useAuth();
  const [connectionStatus, setConnectionStatus] = useState<SlackConnectionStatus>({ connected: false });
  const [channels, setChannels] = useState<SlackChannel[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState('');
  const [selectedChannel, setSelectedChannel] = useState('');
  const [showChannelSelector, setShowChannelSelector] = useState(false);
  const [testResult, setTestResult] = useState<{ success?: boolean; error?: string } | null>(null);

  // Check for OAuth callback results on component mount
  useEffect(() => {
    const oauthResult = checkSlackOAuthResult();
    if (oauthResult.success) {
      // Clear URL params and refresh connection status
      window.history.replaceState({}, document.title, window.location.pathname);
      loadConnectionStatus();
    } else if (oauthResult.error) {
      setTestResult({ error: `Connection failed: ${oauthResult.error}` });
      window.history.replaceState({}, document.title, window.location.pathname);
    }
  }, []);

  const loadConnectionStatus = async () => {
    try {
      setLoading(true);
      const status = await getSlackConnectionStatus();
      setConnectionStatus(status);

      if (status.connected) {
        const channelsResult = await fetchSlackChannels();
        if (channelsResult.success && channelsResult.channels) {
          setChannels(channelsResult.channels);
        } else if (channelsResult.error === 'slack_disconnected') {
          // Token expired, refresh status
          setConnectionStatus({ connected: false });
        }
      }
    } catch (error) {
      console.error('Error loading Slack connection status:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadConnectionStatus();
  }, []);

  const handleConnect = async () => {
    if (!user) return;
    
    setActionLoading('connecting');
    try {
      const oauthUrl = generateSlackOAuthURL(user.id);
      window.location.href = oauthUrl;
    } catch (error) {
      console.error('Error initiating Slack OAuth:', error);
      setTestResult({ error: 'Failed to initiate Slack connection' });
      setActionLoading('');
    }
  };

  const handleDisconnect = async () => {
    setActionLoading('disconnecting');
    try {
      const success = await disconnectSlack();
      if (success) {
        setConnectionStatus({ connected: false });
        setChannels([]);
        setSelectedChannel('');
        setShowChannelSelector(false);
        setTestResult({ success: true });
      } else {
        setTestResult({ error: 'Failed to disconnect Slack' });
      }
    } catch (error) {
      console.error('Error disconnecting Slack:', error);
      setTestResult({ error: 'Failed to disconnect Slack' });
    } finally {
      setActionLoading('');
    }
  };

  const handleChannelChange = async (channelId: string) => {
    if (!channelId) return;

    setActionLoading('updating');
    try {
      const channel = channels.find(ch => ch.id === channelId);
      if (!channel) return;

      const success = await updateSlackChannel(channelId, channel.name);
      if (success) {
        setConnectionStatus(prev => ({
          ...prev,
          channel_name: channel.name
        }));
        setSelectedChannel('');
        setShowChannelSelector(false);
        setTestResult({ success: true });
      } else {
        setTestResult({ error: 'Failed to update channel selection' });
      }
    } catch (error) {
      console.error('Error updating Slack channel:', error);
      setTestResult({ error: 'Failed to update channel selection' });
    } finally {
      setActionLoading('');
    }
  };

  const handleToggleNotifications = async () => {
    setActionLoading('toggling');
    try {
      const newEnabled = !connectionStatus.notifications_enabled;
      const success = await toggleSlackNotifications(newEnabled);
      if (success) {
        setConnectionStatus(prev => ({
          ...prev,
          notifications_enabled: newEnabled
        }));
        setTestResult({ success: true });
      } else {
        setTestResult({ error: 'Failed to update notification settings' });
      }
    } catch (error) {
      console.error('Error toggling notifications:', error);
      setTestResult({ error: 'Failed to update notification settings' });
    } finally {
      setActionLoading('');
    }
  };

  const handleSendTest = async () => {
    setActionLoading('testing');
    setTestResult(null);
    try {
      const result = await sendTestSlackNotification();
      setTestResult(result);
    } catch (error) {
      console.error('Error sending test notification:', error);
      setTestResult({ error: 'Failed to send test notification' });
    } finally {
      setActionLoading('');
    }
  };

  if (loading) {
    return (
      <div className={`bg-gray-800 rounded-lg p-6 ${className}`}>
        <div className="flex items-center gap-3 mb-4">
          <Slack className="w-5 h-5 text-purple-400" />
          <h3 className="text-lg font-medium text-white">Slack Integration</h3>
        </div>
        <div className="flex items-center justify-center py-8">
          <Loader2 className="w-6 h-6 text-yellow-400 animate-spin" />
        </div>
      </div>
    );
  }

  return (
    <div className={`bg-gray-800 rounded-lg p-6 ${className}`}>
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <Slack className="w-5 h-5 text-purple-400" />
          <h3 className="text-lg font-medium text-white">Slack Integration</h3>
        </div>
        {connectionStatus.connected && (
          <div className="flex items-center gap-2 text-sm text-green-400">
            <CheckCircle className="w-4 h-4" />
            <span>Connected</span>
          </div>
        )}
      </div>

      {/* Connection Status */}
      {!connectionStatus.connected ? (
        <div className="space-y-4">
          <p className="text-gray-400">
            Connect your Slack workspace to receive notifications when content briefs are approved and articles are generated.
          </p>
          
          <div className="bg-gray-700/50 rounded-lg p-4">
            <h4 className="font-medium text-white mb-2">What you'll get:</h4>
            <ul className="text-sm text-gray-300 space-y-1">
              <li>• Real-time notifications in your chosen Slack channel</li>
              <li>• Rich message formatting with all important details</li>
              <li>• Notifications for content brief approvals</li>
              <li>• Notifications for article generations</li>
            </ul>
          </div>

          <button
            onClick={handleConnect}
            disabled={actionLoading === 'connecting'}
            className="flex items-center gap-2 bg-purple-600 hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed text-white px-4 py-2 rounded-lg transition-colors"
          >
            {actionLoading === 'connecting' ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <ExternalLink className="w-4 h-4" />
            )}
            Connect to Slack
          </button>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Connected Status */}
          <div className="bg-green-900/20 border border-green-800 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <CheckCircle className="w-5 h-5 text-green-400 mt-0.5" />
              <div className="flex-1">
                <h4 className="font-medium text-green-400 mb-1">Connected to Slack</h4>
                <div className="text-sm text-gray-300 space-y-1">
                  <p><strong>Workspace:</strong> {connectionStatus.team_name}</p>
                  <p><strong>Channel:</strong> #{connectionStatus.channel_name}</p>
                  <p><strong>Notifications:</strong> {connectionStatus.notifications_enabled ? 'Enabled' : 'Disabled'}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Settings */}
          <div className="space-y-4">
            <h4 className="font-medium text-white flex items-center gap-2">
              <Settings className="w-4 h-4" />
              Settings
            </h4>

            {/* Notification Toggle */}
            <div className="flex items-center justify-between p-3 bg-gray-700/50 rounded-lg">
              <div className="flex items-center gap-3">
                {connectionStatus.notifications_enabled ? (
                  <Bell className="w-4 h-4 text-green-400" />
                ) : (
                  <BellOff className="w-4 h-4 text-gray-400" />
                )}
                <div>
                  <p className="text-sm font-medium text-white">Slack Notifications</p>
                  <p className="text-xs text-gray-400">Receive notifications in your Slack channel</p>
                </div>
              </div>
              <button
                onClick={handleToggleNotifications}
                disabled={actionLoading === 'toggling'}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-yellow-500 focus:ring-offset-2 focus:ring-offset-gray-800 ${
                  connectionStatus.notifications_enabled ? 'bg-green-600' : 'bg-gray-600'
                }`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                    connectionStatus.notifications_enabled ? 'translate-x-6' : 'translate-x-1'
                  }`}
                />
              </button>
            </div>

            {/* Channel Selection */}
            <div className="p-3 bg-gray-700/50 rounded-lg">
              <div className="flex items-center justify-between mb-2">
                <p className="text-sm font-medium text-white">Notification Channel</p>
                <button
                  onClick={() => setShowChannelSelector(!showChannelSelector)}
                  className="text-xs text-yellow-400 hover:text-yellow-300"
                >
                  Change
                </button>
              </div>
              <p className="text-xs text-gray-400">#{connectionStatus.channel_name}</p>

              {showChannelSelector && (
                <div className="mt-3">
                  <select
                    value={selectedChannel}
                    onChange={(e) => setSelectedChannel(e.target.value)}
                    className="w-full bg-gray-600 text-white text-sm rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-yellow-500"
                  >
                    <option value="">Select a channel...</option>
                    {channels.map((channel) => (
                      <option key={channel.id} value={channel.id}>
                        #{channel.name} {channel.is_private ? '(private)' : ''} 
                        {channel.is_member ? '' : ' (not a member)'}
                      </option>
                    ))}
                  </select>
                  <div className="flex gap-2 mt-2">
                    <button
                      onClick={() => handleChannelChange(selectedChannel)}
                      disabled={!selectedChannel || actionLoading === 'updating'}
                      className="px-3 py-1 bg-yellow-600 hover:bg-yellow-700 disabled:opacity-50 disabled:cursor-not-allowed text-white text-xs rounded transition-colors"
                    >
                      {actionLoading === 'updating' ? (
                        <Loader2 className="w-3 h-3 animate-spin" />
                      ) : (
                        'Update'
                      )}
                    </button>
                    <button
                      onClick={() => setShowChannelSelector(false)}
                      className="px-3 py-1 bg-gray-600 hover:bg-gray-700 text-white text-xs rounded transition-colors"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Test Notification */}
          <div className="pt-4 border-t border-gray-700">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-white">Test Notification</p>
                <p className="text-xs text-gray-400">Send a test message to verify your setup</p>
              </div>
              <button
                onClick={handleSendTest}
                disabled={actionLoading === 'testing' || !connectionStatus.notifications_enabled}
                className="px-3 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm rounded-lg transition-colors"
              >
                {actionLoading === 'testing' ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  'Send Test'
                )}
              </button>
            </div>
          </div>

          {/* Disconnect */}
          <div className="pt-4 border-t border-gray-700">
            <button
              onClick={handleDisconnect}
              disabled={actionLoading === 'disconnecting'}
              className="flex items-center gap-2 text-red-400 hover:text-red-300 disabled:opacity-50 disabled:cursor-not-allowed text-sm transition-colors"
            >
              {actionLoading === 'disconnecting' ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                'Disconnect Slack'
              )}
            </button>
          </div>
        </div>
      )}

      {/* Result Messages */}
      {testResult && (
        <div className={`mt-4 p-3 rounded-lg flex items-start gap-2 ${
          testResult.success ? 'bg-green-900/20 border border-green-800' : 'bg-red-900/20 border border-red-800'
        }`}>
          {testResult.success ? (
            <CheckCircle className="w-4 h-4 text-green-400 mt-0.5" />
          ) : (
            <AlertCircle className="w-4 h-4 text-red-400 mt-0.5" />
          )}
          <p className={`text-sm ${testResult.success ? 'text-green-400' : 'text-red-400'}`}>
            {testResult.success ? 'Operation completed successfully!' : testResult.error}
          </p>
        </div>
      )}
    </div>
  );
}