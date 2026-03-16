"use client";

import React, { useState } from "react";
import Button from "@/components/ui/Button";
import Card from "@/components/ui/Card";

export default function SettingsPage() {
  const [companySettings, setCompanySettings] = useState({
    company_name: "FieldPro Services",
    address: "123 Main Street",
    phone: "(555) 000-1234",
    email: "info@fieldpro.com",
    tax_rate: 8.5,
  });

  const [userProfile, setUserProfile] = useState({
    name: "Admin User",
    email: "admin@fieldpro.com",
    current_password: "",
    new_password: "",
    confirm_password: "",
  });

  const [notifications, setNotifications] = useState({
    email_notifications: true,
    sms_notifications: false,
  });

  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    // Simulate save
    await new Promise((resolve) => setTimeout(resolve, 500));
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  const inputClass =
    "w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20";

  return (
    <div className="space-y-6">
      {/* Header */}
      <h1 className="text-2xl font-bold text-gray-900">Settings</h1>

      {/* Saved Toast */}
      {saved && (
        <div className="rounded-lg border border-green-200 bg-green-50 p-4 text-sm text-green-700">
          Settings saved successfully.
        </div>
      )}

      {/* Company Settings */}
      <Card>
        <h2 className="mb-4 text-lg font-semibold text-gray-900">Company Settings</h2>
        <div className="space-y-4">
          <div>
            <label className="mb-1.5 block text-sm font-medium text-gray-700">
              Company Name
            </label>
            <input
              type="text"
              value={companySettings.company_name}
              onChange={(e) =>
                setCompanySettings((s) => ({ ...s, company_name: e.target.value }))
              }
              className={inputClass}
            />
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium text-gray-700">
              Address
            </label>
            <input
              type="text"
              value={companySettings.address}
              onChange={(e) =>
                setCompanySettings((s) => ({ ...s, address: e.target.value }))
              }
              className={inputClass}
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-700">
                Phone
              </label>
              <input
                type="tel"
                value={companySettings.phone}
                onChange={(e) =>
                  setCompanySettings((s) => ({ ...s, phone: e.target.value }))
                }
                className={inputClass}
              />
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-700">
                Email
              </label>
              <input
                type="email"
                value={companySettings.email}
                onChange={(e) =>
                  setCompanySettings((s) => ({ ...s, email: e.target.value }))
                }
                className={inputClass}
              />
            </div>
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium text-gray-700">
              Company Logo
            </label>
            <div className="flex items-center justify-center rounded-lg border-2 border-dashed border-gray-300 px-6 py-8">
              <div className="text-center">
                <svg
                  className="mx-auto h-10 w-10 text-gray-400"
                  fill="none"
                  viewBox="0 0 24 24"
                  strokeWidth={1.5}
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909M3.75 21h16.5a1.5 1.5 0 001.5-1.5V5.25a1.5 1.5 0 00-1.5-1.5H3.75a1.5 1.5 0 00-1.5 1.5v14.25c0 .828.672 1.5 1.5 1.5z"
                  />
                </svg>
                <p className="mt-2 text-sm text-gray-500">
                  Click or drag to upload logo
                </p>
                <p className="mt-1 text-xs text-gray-400">
                  PNG, JPG up to 2MB
                </p>
              </div>
            </div>
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium text-gray-700">
              Tax Rate (%)
            </label>
            <input
              type="number"
              value={companySettings.tax_rate}
              onChange={(e) =>
                setCompanySettings((s) => ({
                  ...s,
                  tax_rate: Number(e.target.value),
                }))
              }
              className={`${inputClass} w-32`}
              min={0}
              max={100}
              step={0.1}
            />
          </div>
        </div>
      </Card>

      {/* User Profile */}
      <Card>
        <h2 className="mb-4 text-lg font-semibold text-gray-900">User Profile</h2>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-700">
                Name
              </label>
              <input
                type="text"
                value={userProfile.name}
                onChange={(e) =>
                  setUserProfile((s) => ({ ...s, name: e.target.value }))
                }
                className={inputClass}
              />
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-700">
                Email
              </label>
              <input
                type="email"
                value={userProfile.email}
                onChange={(e) =>
                  setUserProfile((s) => ({ ...s, email: e.target.value }))
                }
                className={inputClass}
              />
            </div>
          </div>
          <div className="border-t border-gray-100 pt-4">
            <h3 className="mb-3 text-sm font-semibold text-gray-900">Change Password</h3>
            <div className="space-y-3">
              <div>
                <label className="mb-1.5 block text-sm font-medium text-gray-700">
                  Current Password
                </label>
                <input
                  type="password"
                  value={userProfile.current_password}
                  onChange={(e) =>
                    setUserProfile((s) => ({
                      ...s,
                      current_password: e.target.value,
                    }))
                  }
                  className={inputClass}
                  placeholder="Enter current password"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-gray-700">
                    New Password
                  </label>
                  <input
                    type="password"
                    value={userProfile.new_password}
                    onChange={(e) =>
                      setUserProfile((s) => ({
                        ...s,
                        new_password: e.target.value,
                      }))
                    }
                    className={inputClass}
                    placeholder="Enter new password"
                  />
                </div>
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-gray-700">
                    Confirm Password
                  </label>
                  <input
                    type="password"
                    value={userProfile.confirm_password}
                    onChange={(e) =>
                      setUserProfile((s) => ({
                        ...s,
                        confirm_password: e.target.value,
                      }))
                    }
                    className={inputClass}
                    placeholder="Confirm new password"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      </Card>

      {/* Notification Preferences */}
      <Card>
        <h2 className="mb-4 text-lg font-semibold text-gray-900">
          Notification Preferences
        </h2>
        <div className="space-y-4">
          <label className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-900">
                Email Notifications
              </p>
              <p className="text-sm text-gray-500">
                Receive updates and alerts via email
              </p>
            </div>
            <button
              type="button"
              onClick={() =>
                setNotifications((n) => ({
                  ...n,
                  email_notifications: !n.email_notifications,
                }))
              }
              className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${
                notifications.email_notifications
                  ? "bg-blue-600"
                  : "bg-gray-200"
              }`}
            >
              <span
                className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                  notifications.email_notifications
                    ? "translate-x-5"
                    : "translate-x-0"
                }`}
              />
            </button>
          </label>
          <label className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-900">
                SMS Notifications
              </p>
              <p className="text-sm text-gray-500">
                Receive urgent alerts via text message
              </p>
            </div>
            <button
              type="button"
              onClick={() =>
                setNotifications((n) => ({
                  ...n,
                  sms_notifications: !n.sms_notifications,
                }))
              }
              className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${
                notifications.sms_notifications ? "bg-blue-600" : "bg-gray-200"
              }`}
            >
              <span
                className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                  notifications.sms_notifications
                    ? "translate-x-5"
                    : "translate-x-0"
                }`}
              />
            </button>
          </label>
        </div>
      </Card>

      {/* Save Button */}
      <div className="flex justify-end">
        <Button onClick={handleSave} disabled={saving} size="lg">
          {saving ? "Saving..." : "Save Settings"}
        </Button>
      </div>
    </div>
  );
}
