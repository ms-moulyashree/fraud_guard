import { useState } from "react";

export default function Settings({ user }: { user?: import("../services/authService").MSUser }) {
  const [notifications, setNotifications] = useState({
    highRisk: true,
    analysisComplete: true,
    weeklyDigest: false,
    newFlags: true,
  });
  const [inputPath, setInputPath] = useState("/sites/Finance/FY2024-25/All Files");
  const [outputPath, setOutputPath] = useState("/sites/Finance/AuditIQ/Outputs");
  const [saved, setSaved] = useState(false);

  const handleSave = () => {
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <div className="flex-1 overflow-y-auto">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-[#0A0D14]/90 backdrop-blur border-b border-[#1E2535] px-8 py-4 flex items-center justify-between">
        <div>
          <h1 className="text-[18px] font-bold tracking-wide text-[#E8EAF0]">Settings</h1>
          <p className="text-[10px] text-[#4A5568] mt-0.5 tracking-wider uppercase">Integrations · Paths · Notifications</p>
        </div>
        <button
          onClick={handleSave}
          className={`px-5 py-2 rounded text-[11px] font-bold tracking-widest uppercase transition-all ${
            saved
              ? "bg-[#00D4AA]/10 text-[#00D4AA] border border-[#00D4AA]/30"
              : "bg-[#00D4AA] text-[#080B10] hover:bg-[#00BFA0]"
          }`}
        >
          {saved ? "✓ Saved" : "Save Changes"}
        </button>
      </div>

      <div className="px-8 py-6 space-y-6 max-w-3xl">

        {/* Integrations */}
        <section>
          <div className="text-[10px] text-[#4A5568] uppercase tracking-widest mb-3">Connected Integrations</div>
          <div className="bg-[#0E1420] border border-[#1E2535] rounded-lg divide-y divide-[#1E2535]">

            {/* Microsoft 365 */}
            <div className="px-5 py-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-[#0078D4]/10 border border-[#0078D4]/20 flex items-center justify-center text-[14px]">
                  🟦
                </div>
                <div>
                  <div className="text-[12px] font-bold text-[#E8EAF0]">Microsoft 365</div>
                  <div className="text-[10px] text-[#4A5568] mt-0.5">audit@company.com · SharePoint & OneDrive</div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-1.5">
                  <div className="w-2 h-2 rounded-full bg-[#00D4AA]" />
                  <span className="text-[10px] text-[#00D4AA] tracking-wider">Connected</span>
                </div>
                <button className="ml-3 text-[10px] text-[#4A5568] border border-[#1E2535] px-2 py-1 rounded hover:text-[#8A9BB5] transition-colors tracking-wider">
                  Disconnect
                </button>
              </div>
            </div>

            {/* SAP (not connected) */}
            <div className="px-5 py-4 flex items-center justify-between opacity-50">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-[#1E2535] border border-[#2E3A4E] flex items-center justify-center text-[14px]">
                  🔷
                </div>
                <div>
                  <div className="text-[12px] font-bold text-[#E8EAF0]">SAP ERP</div>
                  <div className="text-[10px] text-[#4A5568] mt-0.5">Connect to pull GL data directly</div>
                </div>
              </div>
              <button className="text-[10px] text-[#7C9EFF] border border-[#7C9EFF]/30 px-3 py-1 rounded hover:bg-[#7C9EFF]/10 transition-colors tracking-wider uppercase">
                + Connect
              </button>
            </div>

            {/* Tally */}
            <div className="px-5 py-4 flex items-center justify-between opacity-50">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-[#1E2535] border border-[#2E3A4E] flex items-center justify-center text-[14px]">
                  🟩
                </div>
                <div>
                  <div className="text-[12px] font-bold text-[#E8EAF0]">Tally Prime</div>
                  <div className="text-[10px] text-[#4A5568] mt-0.5">Auto-import vouchers and ledgers</div>
                </div>
              </div>
              <button className="text-[10px] text-[#7C9EFF] border border-[#7C9EFF]/30 px-3 py-1 rounded hover:bg-[#7C9EFF]/10 transition-colors tracking-wider uppercase">
                + Connect
              </button>
            </div>
          </div>
        </section>

        {/* SharePoint Paths */}
        <section>
          <div className="text-[10px] text-[#4A5568] uppercase tracking-widest mb-3">SharePoint Default Paths</div>
          <div className="bg-[#0E1420] border border-[#1E2535] rounded-lg p-5 space-y-4">
            <div>
              <label className="block text-[10px] text-[#4A5568] tracking-widest uppercase mb-2">Default Input Path</label>
              <div className="flex gap-2">
                <input
                  value={inputPath}
                  onChange={(e) => setInputPath(e.target.value)}
                  className="flex-1 bg-[#080B10] border border-[#2E3A4E] rounded px-3 py-2 text-[11px] text-[#8A9BB5] font-mono focus:outline-none focus:border-[#00D4AA]/40 transition-colors"
                />
                <button className="px-3 py-2 border border-[#1E2535] rounded text-[10px] text-[#4A5568] hover:text-[#8A9BB5] transition-colors">
                  Browse
                </button>
              </div>
            </div>
            <div>
              <label className="block text-[10px] text-[#4A5568] tracking-widest uppercase mb-2">Default Output Path</label>
              <div className="flex gap-2">
                <input
                  value={outputPath}
                  onChange={(e) => setOutputPath(e.target.value)}
                  className="flex-1 bg-[#080B10] border border-[#2E3A4E] rounded px-3 py-2 text-[11px] text-[#8A9BB5] font-mono focus:outline-none focus:border-[#00D4AA]/40 transition-colors"
                />
                <button className="px-3 py-2 border border-[#1E2535] rounded text-[10px] text-[#4A5568] hover:text-[#8A9BB5] transition-colors">
                  Browse
                </button>
              </div>
            </div>
          </div>
        </section>

        {/* Notifications */}
        <section>
          <div className="text-[10px] text-[#4A5568] uppercase tracking-widest mb-3">Email Notifications</div>
          <div className="bg-[#0E1420] border border-[#1E2535] rounded-lg divide-y divide-[#1E2535]">
            {[
              { key: "highRisk" as const, label: "High-Risk Alerts", desc: "Immediate email when high-risk flags are raised" },
              { key: "analysisComplete" as const, label: "Analysis Complete", desc: "Notify when a procedure run finishes" },
              { key: "newFlags" as const, label: "New Flag Notifications", desc: "Email per new flag added to the repository" },
              { key: "weeklyDigest" as const, label: "Weekly Digest", desc: "Summary of all flags and analyses every Monday" },
            ].map(({ key, label, desc }) => (
              <div key={key} className="px-5 py-4 flex items-center justify-between">
                <div>
                  <div className="text-[12px] text-[#E8EAF0]">{label}</div>
                  <div className="text-[10px] text-[#4A5568] mt-0.5">{desc}</div>
                </div>
                <button
                  onClick={() => setNotifications((prev) => ({ ...prev, [key]: !prev[key] }))}
                  className={`w-11 h-6 rounded-full border transition-all flex items-center ${
                    notifications[key]
                      ? "bg-[#00D4AA] border-[#00D4AA] justify-end pr-0.5"
                      : "bg-[#1E2535] border-[#2E3A4E] justify-start pl-0.5"
                  }`}
                >
                  <div className="w-5 h-5 rounded-full bg-white shadow" />
                </button>
              </div>
            ))}
          </div>
        </section>

        {/* Audit Config */}
        <section>
          <div className="text-[10px] text-[#4A5568] uppercase tracking-widest mb-3">Audit Configuration</div>
          <div className="bg-[#0E1420] border border-[#1E2535] rounded-lg p-5 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-[12px] text-[#E8EAF0]">Fiscal Year</div>
                <div className="text-[10px] text-[#4A5568] mt-0.5">Current active financial year for all analyses</div>
              </div>
              <select className="bg-[#080B10] border border-[#2E3A4E] text-[#8A9BB5] text-[11px] px-3 py-1.5 rounded focus:outline-none">
                <option>2024 – 25</option>
                <option>2023 – 24</option>
                <option>2022 – 23</option>
              </select>
            </div>
            <div className="flex items-center justify-between">
              <div>
                <div className="text-[12px] text-[#E8EAF0]">Currency</div>
                <div className="text-[10px] text-[#4A5568] mt-0.5">Primary display currency</div>
              </div>
              <select className="bg-[#080B10] border border-[#2E3A4E] text-[#8A9BB5] text-[11px] px-3 py-1.5 rounded focus:outline-none">
                <option>INR (₹)</option>
                <option>USD ($)</option>
                <option>EUR (€)</option>
              </select>
            </div>
            <div className="flex items-center justify-between">
              <div>
                <div className="text-[12px] text-[#E8EAF0]">High-Risk Threshold</div>
                <div className="text-[10px] text-[#4A5568] mt-0.5">Amount above which transactions are auto-escalated</div>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-[11px] text-[#4A5568]">₹</span>
                <input
                  defaultValue="500000"
                  className="bg-[#080B10] border border-[#2E3A4E] text-[#8A9BB5] text-[11px] px-3 py-1.5 rounded w-28 focus:outline-none focus:border-[#00D4AA]/40 font-mono"
                />
              </div>
            </div>
          </div>
        </section>

        {/* Danger Zone */}
        <section>
          <div className="text-[10px] text-[#FF4D6D]/60 uppercase tracking-widest mb-3">Danger Zone</div>
          <div className="bg-[#0E1420] border border-[#FF4D6D]/10 rounded-lg p-5 flex items-center justify-between">
            <div>
              <div className="text-[12px] text-[#E8EAF0]">Clear All Analyses</div>
              <div className="text-[10px] text-[#4A5568] mt-0.5">Permanently delete all analysis runs and flag data</div>
            </div>
            <button className="px-4 py-2 rounded text-[11px] border border-[#FF4D6D]/30 text-[#FF4D6D] hover:bg-[#FF4D6D]/10 transition-colors tracking-wider uppercase">
              Clear Data
            </button>
          </div>
        </section>
      </div>
    </div>
  );
}