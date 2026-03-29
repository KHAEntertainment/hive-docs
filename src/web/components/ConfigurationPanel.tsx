import React, { useState, useEffect } from 'react';
import { HiveDocsConfig } from '../../shared/types.js';
import './ConfigurationPanel.css';

interface ConfigurationPanelProps {
  isOpen: boolean;
  onClose: () => void;
  config: HiveDocsConfig;
  onConfigUpdate: (config: Partial<HiveDocsConfig>) => Promise<void>;
}

export const ConfigurationPanel: React.FC<ConfigurationPanelProps> = ({
  isOpen,
  onClose,
  config,
  onConfigUpdate
}) => {
  const [localConfig, setLocalConfig] = useState<HiveDocsConfig>(config);
  const [activeTab, setActiveTab] = useState<'import' | 'git' | 'mcp'>('import');
  const [isSaving, setIsSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);

  useEffect(() => {
    setLocalConfig(config);
    setHasChanges(false);
  }, [config]);

  useEffect(() => {
    const configChanged = JSON.stringify(localConfig) !== JSON.stringify(config);
    setHasChanges(configChanged);
  }, [localConfig, config]);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await onConfigUpdate(localConfig);
      setHasChanges(false);
    } catch (error) {
      console.error('Failed to save configuration:', error);
    } finally {
      setIsSaving(false);
    }
  };

  const handleReset = () => {
    setLocalConfig(config);
    setHasChanges(false);
  };

  const updateConfig = (updates: Partial<HiveDocsConfig>) => {
    setLocalConfig(prev => ({
      ...prev,
      ...updates
    }));
  };

  const addIgnoreRule = () => {
    const newRule = prompt('Enter ignore pattern (e.g., *.log, docs/*.md):');
    if (newRule && newRule.trim()) {
      updateConfig({
        import: {
          ...localConfig.import,
          ignoreRules: [...localConfig.import.ignoreRules, newRule.trim()]
        }
      });
    }
  };

  const removeIgnoreRule = (index: number) => {
    updateConfig({
      import: {
        ...localConfig.import,
        ignoreRules: localConfig.import.ignoreRules.filter((_, i) => i !== index)
      }
    });
  };

  if (!isOpen) return null;

  return (
    <div className="config-panel-overlay">
      <div className="config-panel">
        <div className="config-panel-header">
          <h2>Configuration</h2>
          <button className="close-btn" onClick={onClose}>×</button>
        </div>

        <div className="config-panel-content">
          <div className="config-tabs">
            <button
              className={`tab-btn ${activeTab === 'import' ? 'active' : ''}`}
              onClick={() => setActiveTab('import')}
            >
              Import Rules
            </button>
            <button
              className={`tab-btn ${activeTab === 'git' ? 'active' : ''}`}
              onClick={() => setActiveTab('git')}
            >
              Git Integration
            </button>
            <button
              className={`tab-btn ${activeTab === 'mcp' ? 'active' : ''}`}
              onClick={() => setActiveTab('mcp')}
            >
              MCP Server
            </button>
          </div>

          <div className="config-content">
            {activeTab === 'import' && (
              <div className="config-section">
                <h3>File Import Rules</h3>
                <p className="section-description">
                  Configure which files should be ignored during workspace scanning.
                </p>

                <div className="ignore-rules">
                  <div className="ignore-rules-header">
                    <h4>Custom Ignore Rules</h4>
                    <button className="btn btn-secondary" onClick={addIgnoreRule}>
                      Add Rule
                    </button>
                  </div>

                  <div className="ignore-rules-list">
                    {localConfig.import.ignoreRules.length === 0 ? (
                      <div className="empty-state">
                        No custom ignore rules defined
                      </div>
                    ) : (
                      localConfig.import.ignoreRules.map((rule, index) => (
                        <div key={index} className="ignore-rule-item">
                          <code className="rule-pattern">{rule}</code>
                          <button
                            className="remove-rule-btn"
                            onClick={() => removeIgnoreRule(index)}
                            title="Remove rule"
                          >
                            ×
                          </button>
                        </div>
                      ))
                    )}
                  </div>

                  <div className="default-rules">
                    <h4>Default Ignore Rules</h4>
                    <div className="default-rules-list">
                      {localConfig.import.defaultIgnoreRules.map((rule, index) => (
                        <code key={index} className="default-rule">{rule}</code>
                      ))}
                    </div>
                    <p className="help-text">
                      Default rules are always applied and cannot be modified.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'git' && (
              <div className="config-section">
                <h3>Git Integration</h3>
                <p className="section-description">
                  Control whether database files are tracked in your git repository.
                </p>

                <div className="git-settings">
                  <label className="setting-checkbox">
                    <input
                      type="checkbox"
                      checked={localConfig.git.ignoreDatabase}
                      onChange={(e) => updateConfig({
                        git: {
                          ...localConfig.git,
                          ignoreDatabase: e.target.checked
                        }
                      })}
                    />
                    <span className="checkmark"></span>
                    <span className="setting-label">
                      Add database files to .gitignore
                      <span className="setting-description">
                        Automatically exclude *.sqlite and *.sqlite-vec files from git tracking
                      </span>
                    </span>
                  </label>

                  <div className="git-info">
                    <h4>What this does:</h4>
                    <ul>
                      <li>Adds database file patterns to your .gitignore</li>
                      <li>Prevents accidental commits of local documentation</li>
                      <li>Keeps your documentation private to your workspace</li>
                      <li>Creates .gitignore if it doesn't exist</li>
                    </ul>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'mcp' && (
              <div className="config-section">
                <h3>MCP Server Configuration</h3>
                <p className="section-description">
                  Configure the Model Context Protocol server for AI agent integration.
                </p>

                <div className="mcp-settings">
                  <label className="setting-checkbox">
                    <input
                      type="checkbox"
                      checked={localConfig.mcp.enabled}
                      onChange={(e) => updateConfig({
                        mcp: {
                          ...localConfig.mcp,
                          enabled: e.target.checked
                        }
                      })}
                    />
                    <span className="checkmark"></span>
                    <span className="setting-label">
                      Enable MCP Server
                      <span className="setting-description">
                        Allow AI agents to access your documentation via MCP
                      </span>
                    </span>
                  </label>

                  <div className="setting-group">
                    <label className="setting-field">
                      <span className="field-label">Server Port</span>
                      <input
                        type="number"
                        min="1024"
                        max="65535"
                        value={localConfig.mcp.port}
                        onChange={(e) => updateConfig({
                          mcp: {
                            ...localConfig.mcp,
                            port: parseInt(e.target.value) || 3000
                          }
                        })}
                        className="field-input"
                      />
                      <span className="field-description">
                        Port number for the MCP server (1024-65535)
                      </span>
                    </label>
                  </div>

                  <label className="setting-checkbox">
                    <input
                      type="checkbox"
                      checked={localConfig.mcp.autoStart}
                      onChange={(e) => updateConfig({
                        mcp: {
                          ...localConfig.mcp,
                          autoStart: e.target.checked
                        }
                      })}
                    />
                    <span className="checkmark"></span>
                    <span className="setting-label">
                      Auto-start with extension
                      <span className="setting-description">
                        Automatically start the MCP server when the extension loads
                      </span>
                    </span>
                  </label>

                  {localConfig.mcp.enabled && (
                    <div className="mcp-info">
                      <h4>Server Information:</h4>
                      <div className="server-info">
                        <div className="info-item">
                          <span className="info-label">Server URL:</span>
                          <code>http://localhost:{localConfig.mcp.port}</code>
                        </div>
                        <div className="info-item">
                          <span className="info-label">Status:</span>
                          <span className="status-badge">
                            {localConfig.mcp.autoStart ? 'Auto-start enabled' : 'Manual start'}
                          </span>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="config-panel-footer">
          <div className="footer-left">
            {hasChanges && (
              <span className="changes-indicator">Unsaved changes</span>
            )}
          </div>
          <div className="footer-right">
            <button 
              className="btn btn-secondary" 
              onClick={handleReset}
              disabled={!hasChanges}
            >
              Reset
            </button>
            <button className="btn btn-secondary" onClick={onClose}>
              Cancel
            </button>
            <button 
              className="btn btn-primary" 
              onClick={handleSave}
              disabled={!hasChanges || isSaving}
            >
              {isSaving ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};