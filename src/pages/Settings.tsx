import { useState } from "react";

export default function Settings({
  user,
}: {
  user?: import("../services/authService").MSUser;
}) {
  const [notifications, setNotifications] = useState({
    highRisk: true,
    analysisComplete: true,
    weeklyDigest: false,
    newFlags: true,
  });

  const [inputPath, setInputPath] = useState(
    "/sites/Finance/FY2024-25/All Files"
  );

  const [outputPath, setOutputPath] = useState(
    "/sites/Finance/AuditIQ/Outputs"
  );

  const [saved, setSaved] = useState(false);

  const handleSave = () => {
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <div className="flex-1 overflow-y-auto bg-gray-50">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-white border-b border-gray-200 px-8 py-5 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Settings</h1>
          <p className="text-sm text-gray-500 mt-1">
            Manage integrations, notifications and audit preferences
          </p>
        </div>

        <button
          onClick={handleSave}
          className={`px-5 py-2.5 rounded-xl text-sm font-semibold transition-all ${
            saved
              ? "bg-green-100 text-green-700 border border-green-200"
              : "bg-blue-600 text-white hover:bg-blue-700 shadow-sm"
          }`}
        >
          {saved ? "✓ Saved" : "Save Changes"}
        </button>
      </div>

      <div className="p-8 space-y-8 max-w-5xl mx-auto">
        {/* Integrations */}
        <section className="bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100">
            <h2 className="text-lg font-semibold text-gray-800">
              Connected Integrations
            </h2>
            <p className="text-sm text-gray-500 mt-1">
              Manage external systems connected to FraudGuard
            </p>
          </div>

          <div className="divide-y divide-gray-100">
            {/* Microsoft */}
            <div className="px-6 py-5 flex items-center justify-between hover:bg-gray-50 transition-colors">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-blue-100 flex items-center justify-center text-xl">
                  🟦
                </div>

                <div>
                  <div className="text-sm font-semibold text-gray-800">
                    Microsoft 365
                  </div>
                  <div className="text-sm text-gray-500 mt-1">
                    audit@company.com · SharePoint & OneDrive
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2 text-green-600">
                  <div className="w-2.5 h-2.5 rounded-full bg-green-500" />
                  <span className="text-sm font-medium">Connected</span>
                </div>

                <button className="px-4 py-2 border border-gray-300 rounded-lg text-sm text-gray-600 hover:bg-gray-100 transition-colors">
                  Disconnect
                </button>
              </div>
            </div>

            {/* SAP */}
            <div className="px-6 py-5 flex items-center justify-between hover:bg-gray-50 transition-colors">
              <div className="flex items-center gap-4">
              </div>

            </div>

            {/* Tally */}
            <div className="px-6 py-5 flex items-center justify-between hover:bg-gray-50 transition-colors">
              <div className="flex items-center gap-4">              
              </div>
            </div>
          </div>
        </section>

        {/* SharePoint Paths */}
        <section className="bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100">
            <h2 className="text-lg font-semibold text-gray-800">
              SharePoint Default Paths
            </h2>
            <p className="text-sm text-gray-500 mt-1">
              Configure where files are imported and exported
            </p>
          </div>

          <div className="p-6 space-y-6">
            {/* Input */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Default Input Path
              </label>

              <div className="flex gap-3">
                <input
                  value={inputPath}
                  onChange={(e) => setInputPath(e.target.value)}
                  className="flex-1 bg-white border border-gray-300 rounded-xl px-4 py-3 text-sm text-gray-700 font-mono focus:outline-none focus:ring-2 focus:ring-blue-500"
                />

                <button className="px-4 py-3 border border-gray-300 rounded-xl text-sm text-gray-600 hover:bg-gray-100 transition-colors">
                  Browse
                </button>
              </div>
            </div>

            {/* Output */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Default Output Path
              </label>

              <div className="flex gap-3">
                <input
                  value={outputPath}
                  onChange={(e) => setOutputPath(e.target.value)}
                  className="flex-1 bg-white border border-gray-300 rounded-xl px-4 py-3 text-sm text-gray-700 font-mono focus:outline-none focus:ring-2 focus:ring-blue-500"
                />

                <button className="px-4 py-3 border border-gray-300 rounded-xl text-sm text-gray-600 hover:bg-gray-100 transition-colors">
                  Browse
                </button>
              </div>
            </div>
          </div>
        </section>


        {/* Danger Zone */}
        <section className="bg-white border border-red-200 rounded-2xl shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-red-100 bg-red-50">
            <h2 className="text-lg font-semibold text-red-600">
              Danger Zone
            </h2>

            <p className="text-sm text-red-400 mt-1">
              Destructive actions for this engagement
            </p>
          </div>

          <div className="p-6 flex items-center justify-between">
            <div>
              <div className="text-sm font-medium text-gray-800">
                Clear All Analyses
              </div>

              <div className="text-sm text-gray-500 mt-1">
                Permanently delete all analysis runs and flag data
              </div>
            </div>

            <button className="px-5 py-2.5 rounded-xl border border-red-300 text-red-600 text-sm font-medium hover:bg-red-50 transition-colors">
              Clear Data
            </button>
          </div>
        </section>
      </div>
    </div>
  );
}