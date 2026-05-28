import { useEffect, useState } from "react";
import type { MSUser } from "../services/authService";
import { api, AuthError } from "../services/apiService";

export default function Settings({
  user,
}: {
  user?: MSUser;
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

  useEffect(() => {
  api.auth
    .me()
    .then(console.log)
    .catch((err) => {
      if (err instanceof AuthError) {
        return;
      }

      console.error(err);
    });
}, []);

  const handleSave = () => {
    setSaved(true);

    setTimeout(() => setSaved(false), 2000);
  };

  const username =
    user?.displayName || "Audit User";

  const email =
    user?.email || "audit@company.com";

  const Toggle = ({
    enabled,
    onChange,
  }: {
    enabled: boolean;
    onChange: () => void;
  }) => (
    <button
      type="button"
      onClick={onChange}
      className={`relative w-11 h-6 rounded-full transition-colors ${
        enabled ? "bg-[#1A1916]" : "bg-[#D6D3CD]"
      }`}
    >
      <div
        className={`absolute top-0.5 w-5 h-5 rounded-full bg-white transition-transform ${
          enabled ? "translate-x-5" : "translate-x-0.5"
        }`}
      />
    </button>
  );

  return (
    <div className="flex-1 overflow-y-auto bg-[#F7F7F5]">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-white border-b border-[#ECEAE5] px-8 py-5 flex items-center justify-between">
        <div>
          <h1 className="text-[24px] font-semibold text-[#1A1916]">
            Settings
          </h1>

          <p className="text-[14px] text-[#6B6560] mt-1">
            Manage integrations, notifications and audit preferences
          </p>
        </div>

        <button
          onClick={handleSave}
          className={`px-5 py-2.5 rounded-xl text-[14px] font-semibold transition-all ${
            saved
              ? "bg-[#EBF5EE] text-[#2D7A45] border border-[#B8DFC4]"
              : "bg-[#1A1916] text-white hover:bg-[#2A2824]"
          }`}
        >
          {saved ? "✓ Saved" : "Save Changes"}
        </button>
      </div>

      <div className="p-8 space-y-8 max-w-5xl mx-auto">
        {/* Profile */}
        <section className="bg-white border border-[#ECEAE5] rounded-2xl overflow-hidden">
          <div className="px-6 py-4 border-b border-[#F2EFE9]">
            <h2 className="text-[18px] font-semibold text-[#1A1916]">
              User Profile
            </h2>

            <p className="text-[13px] text-[#6B6560] mt-1">
              Signed in account details
            </p>
          </div>

          <div className="p-6 flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-2xl bg-[#F2EFE9] flex items-center justify-center text-[18px] font-semibold text-[#3A3830] uppercase">
                {username.charAt(0)}
              </div>

              <div>
                <div className="text-[15px] font-semibold text-[#1A1916]">
                  {username}
                </div>

                <div className="text-[13px] text-[#6B6560] mt-1">
                  {email}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2 text-[#2D7A45]">
              <div className="w-2.5 h-2.5 rounded-full bg-[#2D7A45]" />

              <span className="text-[13px] font-medium">
                Microsoft Connected
              </span>
            </div>
          </div>
        </section>

        {/* Integrations */}
        <section className="bg-white border border-[#ECEAE5] rounded-2xl overflow-hidden">
          <div className="px-6 py-4 border-b border-[#F2EFE9]">
            <h2 className="text-[18px] font-semibold text-[#1A1916]">
              Connected Integrations
            </h2>

            <p className="text-[13px] text-[#6B6560] mt-1">
              Manage external systems connected to AuditIQ
            </p>
          </div>

          <div className="divide-y divide-[#F2EFE9]">
            {/* Microsoft */}
            <div className="px-6 py-5 flex items-center justify-between hover:bg-[#FAFAF8] transition-colors">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-[#EEF4FC] flex items-center justify-center text-xl">
                  🟦
                </div>

                <div>
                  <div className="text-[14px] font-semibold text-[#1A1916]">
                    Microsoft 365
                  </div>

                  <div className="text-[13px] text-[#6B6560] mt-1">
                    {email} · SharePoint & OneDrive
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2 text-[#2D7A45]">
                  <div className="w-2.5 h-2.5 rounded-full bg-[#2D7A45]" />

                  <span className="text-[13px] font-medium">
                    Connected
                  </span>
                </div>

                <button className="px-4 py-2 border border-[#DEDAD3] rounded-lg text-[13px] text-[#6B6560] hover:bg-[#F7F5F0] transition-colors">
                  Disconnect
                </button>
              </div>
            </div>

            {/* SAP */}
            <div className="px-6 py-5 flex items-center justify-between hover:bg-[#FAFAF8] transition-colors">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-[#FEF6E8] flex items-center justify-center text-xl">
                  🟨
                </div>

                <div>
                  <div className="text-[14px] font-semibold text-[#1A1916]">
                    SAP ERP
                  </div>

                  <div className="text-[13px] text-[#9B9589] mt-1">
                    No active connection
                  </div>
                </div>
              </div>

              <button className="px-4 py-2 bg-[#1A1916] text-white rounded-lg text-[13px] hover:bg-[#2A2824] transition-colors">
                Connect
              </button>
            </div>

            {/* Tally */}
            <div className="px-6 py-5 flex items-center justify-between hover:bg-[#FAFAF8] transition-colors">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-[#EBF5EE] flex items-center justify-center text-xl">
                  🟩
                </div>

                <div>
                  <div className="text-[14px] font-semibold text-[#1A1916]">
                    Tally Prime
                  </div>

                  <div className="text-[13px] text-[#9B9589] mt-1">
                    No active connection
                  </div>
                </div>
              </div>

              <button className="px-4 py-2 bg-[#1A1916] text-white rounded-lg text-[13px] hover:bg-[#2A2824] transition-colors">
                Connect
              </button>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}