import { useState, useEffect } from "react";
import type { SelectedFile } from "../App";
import { fetchAllFiles, type DriveItem, type SharePointSite } from "../services/graphService";

interface QuickRunPanelProps {
  onClose: () => void;
  onFileSelected: (file: SelectedFile) => void;
}

export default function QuickRunPanel({ onClose, onFileSelected }: QuickRunPanelProps) {
  const [loading, setLoading] = useState(true);
  const [sites, setSites] = useState<SharePointSite[]>([]);
  const [oneDriveFiles, setOneDriveFiles] = useState<DriveItem[]>([]);
  const [expandedSite, setExpandedSite] = useState<string | null>(null);
  const [expandedDrive, setExpandedDrive] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<DriveItem | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState<"sharepoint" | "onedrive">("sharepoint");

  useEffect(() => {
    fetchAllFiles().then(({ sites: s, oneDrive: od }) => {
      setSites(s);
      setOneDriveFiles(od);
      if (s.length > 0) setExpandedSite(s[0].id);
      if (s[0]?.drives.length > 0) setExpandedDrive(s[0].drives[0].id);
    }).finally(() => setLoading(false));
  }, []);

  const fileIcon = (type: DriveItem["type"]) => {
    if (type === "excel") return "◈";
    if (type === "csv") return "◇";
    if (type === "pdf") return "◻";
    return "○";
  };

  const fileColor = (type: DriveItem["type"]) => {
    if (type === "excel") return "text-[#00D4AA]";
    if (type === "csv") return "text-[#7C9EFF]";
    return "text-[#4A5568]";
  };

  // Filter files by search
  const filterItems = (items: DriveItem[]) =>
    items.filter(f => f.name.toLowerCase().includes(searchQuery.toLowerCase()));

  const handleConfirm = () => {
    if (!selectedFile) return;
    onFileSelected({
      name: selectedFile.name,
      path: selectedFile.path,
      columns: selectedFile.columns ?? [],
      rowCount: selectedFile.rowCount ?? 0,
      size: selectedFile.sizeLabel,
    });
  };

  return (
    <div className="w-[320px] bg-[#080B10] border-l border-[#1E2535] flex flex-col shrink-0">
      {/* Header */}
      <div className="px-5 py-4 border-b border-[#1E2535] flex items-center justify-between">
        <div>
          <div className="text-[12px] font-bold text-[#E8EAF0] tracking-wide">Quick Run</div>
          <div className="flex items-center gap-1.5 mt-0.5">
            <div className="w-1.5 h-1.5 rounded-full bg-[#00D4AA]" />
            <span className="text-[10px] text-[#4A5568]">Microsoft 365 · Connected</span>
          </div>
        </div>
        <button onClick={onClose} className="text-[#4A5568] hover:text-[#8A9BB5] text-[16px] transition-colors">✕</button>
      </div>

      {/* Search */}
      <div className="px-4 py-3 border-b border-[#1E2535]">
        <div className="flex items-center gap-2 bg-[#0E1420] border border-[#1E2535] rounded px-3 py-2">
          <span className="text-[#2E3A4E] text-[12px]">⌕</span>
          <input
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="Search files..."
            className="flex-1 bg-transparent text-[11px] text-[#8A9BB5] placeholder-[#2E3A4E] outline-none"
          />
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-[#1E2535]">
        {(["sharepoint", "onedrive"] as const).map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`flex-1 py-2.5 text-[10px] tracking-widest uppercase transition-colors ${
              activeTab === tab
                ? "text-[#00D4AA] border-b-2 border-[#00D4AA]"
                : "text-[#4A5568] hover:text-[#8A9BB5]"
            }`}
          >
            {tab === "sharepoint" ? "SharePoint" : "OneDrive"}
          </button>
        ))}
      </div>

      {/* File Tree */}
      <div className="flex-1 overflow-y-auto px-3 py-3">
        {loading ? (
          <div className="space-y-2 px-2 pt-2">
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="h-8 bg-[#0E1420] border border-[#1E2535] rounded animate-pulse" />
            ))}
            <p className="text-[10px] text-[#2E3A4E] text-center pt-2 tracking-wider">
              Fetching from Microsoft 365...
            </p>
          </div>
        ) : activeTab === "sharepoint" ? (
          <>
            {sites.map(site => (
              <div key={site.id}>
                <button
                  onClick={() => setExpandedSite(expandedSite === site.id ? null : site.id)}
                  className="w-full flex items-center gap-2 px-2 py-2 text-[11px] text-[#8A9BB5] hover:text-[#E8EAF0] transition-colors"
                >
                  <span className="text-[#4A5568]">{expandedSite === site.id ? "▾" : "▸"}</span>
                  <span>🏢</span>
                  <span className="font-medium">{site.name}</span>
                </button>

                {expandedSite === site.id && site.drives.map(drive => (
                  <div key={drive.id} className="ml-4">
                    <button
                      onClick={() => setExpandedDrive(expandedDrive === drive.id ? null : drive.id)}
                      className="w-full flex items-center gap-2 px-2 py-1.5 text-[11px] text-[#8A9BB5] hover:text-[#E8EAF0] transition-colors"
                    >
                      <span className="text-[#4A5568]">{expandedDrive === drive.id ? "▾" : "▸"}</span>
                      <span>📁</span>
                      {drive.name}
                      <span className="ml-auto text-[9px] text-[#2E3A4E]">{drive.items.length}</span>
                    </button>

                    {expandedDrive === drive.id && filterItems(drive.items).map(file => (
                      <button
                        key={file.id}
                        onClick={() => setSelectedFile(file)}
                        className={`w-full ml-4 flex items-center gap-2 px-2 py-1.5 text-[11px] rounded transition-all ${
                          selectedFile?.id === file.id
                            ? "bg-[#00D4AA]/10 text-[#00D4AA] border border-[#00D4AA]/20"
                            : "text-[#4A5568] hover:text-[#8A9BB5]"
                        }`}
                      >
                        <span className={fileColor(file.type)}>{fileIcon(file.type)}</span>
                        <span className="truncate text-left flex-1">{file.name}</span>
                        <span className="text-[9px] text-[#2E3A4E] shrink-0">{file.sizeLabel}</span>
                      </button>
                    ))}
                  </div>
                ))}
              </div>
            ))}
          </>
        ) : (
          <div className="mt-1">
            <div className="text-[9px] text-[#2E3A4E] tracking-widest uppercase px-2 mb-2">My OneDrive</div>
            {filterItems(oneDriveFiles).map(file => (
              <button
                key={file.id}
                onClick={() => setSelectedFile(file)}
                className={`w-full flex items-center gap-2 px-2 py-2 text-[11px] rounded transition-all mb-0.5 ${
                  selectedFile?.id === file.id
                    ? "bg-[#00D4AA]/10 text-[#00D4AA] border border-[#00D4AA]/20"
                    : "text-[#4A5568] hover:text-[#8A9BB5] border border-transparent"
                }`}
              >
                <span className={fileColor(file.type)}>{fileIcon(file.type)}</span>
                <span className="truncate text-left flex-1">{file.name}</span>
                <span className="text-[9px] text-[#2E3A4E]">{file.sizeLabel}</span>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* File Preview */}
      {selectedFile && (
        <div className="border-t border-[#1E2535] px-5 py-4 bg-[#0E1420]">
          <div className="text-[9px] text-[#4A5568] tracking-widest uppercase mb-3">Selected File</div>
          <div className="text-[12px] text-[#E8EAF0] font-bold mb-1 truncate">{selectedFile.name}</div>
          <div className="text-[10px] text-[#2E3A4E] mb-2 truncate">{selectedFile.path}</div>
          <div className="flex gap-3 text-[10px] text-[#4A5568] mb-3">
            {selectedFile.rowCount && <span>{selectedFile.rowCount.toLocaleString()} rows</span>}
            <span>{selectedFile.sizeLabel}</span>
            {selectedFile.columns && <span>{selectedFile.columns.length} cols</span>}
          </div>
          {selectedFile.columns && (
            <div className="flex flex-wrap gap-1 mb-4">
              {selectedFile.columns.slice(0, 5).map(col => (
                <span key={col} className="text-[9px] bg-[#1E2535] text-[#4A5568] px-2 py-0.5 rounded border border-[#2E3A4E]">
                  {col}
                </span>
              ))}
              {selectedFile.columns.length > 5 && (
                <span className="text-[9px] text-[#2E3A4E]">+{selectedFile.columns.length - 5} more</span>
              )}
            </div>
          )}
          <button
            onClick={handleConfirm}
            className="w-full bg-[#00D4AA] text-[#080B10] py-2 rounded text-[11px] font-bold tracking-widest uppercase hover:bg-[#00BFA0] transition-colors"
          >
            Select & Configure →
          </button>
        </div>
      )}
    </div>
  );
}