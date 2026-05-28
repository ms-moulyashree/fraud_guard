
import { useEffect, useState } from "react";

import type {
  Page,
  SelectedFile,
  AnalysisRun,
} from "../App";

import {
  api,
  apiAnalysisToRun,
  type ApiProcedure,
} from "../services/apiService";

const businessAreas = [
  { name: "All Areas", count: 926 },
  { name: "Procure to Pay", count: 334 },
  { name: "Order to Cash", count: 203 },
  { name: "Human Resources", count: 98 },
  { name: "Inventory", count: 128 },
  { name: "Accounting & Financial", count: 54 },
  { name: "Hotel & Rental Properties", count: 51 },
  { name: "PPE", count: 35 },
  { name: "Claims & Disbursement", count: 12 },
  { name: "Travel Expenses", count: 11 },
];

const typeFilters = [
  "All",
  "Statistical",
  "Time-based",
  "Cross-data",
  "Flag",
  "AI-assisted",
];

interface ProceduresLibraryProps {
  selectedFile: SelectedFile | null;

  setCurrentPage: (page: Page) => void;

  setAnalyses: React.Dispatch<
    React.SetStateAction<AnalysisRun[]>
  >;

  setActiveAnalysis: React.Dispatch<
    React.SetStateAction<AnalysisRun | null>
  >;
}

export default function ProceduresLibrary({
  selectedFile,
  setCurrentPage,
  setAnalyses,
  setActiveAnalysis,
}: ProceduresLibraryProps) {

  // DATABASE PROCEDURES
  const [procedures, setProcedures] = useState<ApiProcedure[]>([]);
  const [loading, setLoading] = useState(true);

  const [selectedArea, setSelectedArea] =
    useState("All Areas");

  const [selectedType, setSelectedType] =
    useState("All");

  const [toggled, setToggled] = useState<Set<string>>(
    new Set()
  );

  const [search, setSearch] = useState("");

  const [running, setRunning] = useState(false);

  // LOAD PROCEDURES FROM DATABASE
  useEffect(() => {
    async function loadProcedures() {
      try {
        const data =
          await api.procedures.list();

        setProcedures(data);
      } catch (err) {
        console.error(
          "Failed to load procedures",
          err
        );
      } finally {
        setLoading(false);
      }
    }

    loadProcedures();
  }, []);

  const toggle = (id: string) => {
    setToggled((prev) => {
      const next = new Set(prev);

      next.has(id)
        ? next.delete(id)
        : next.add(id);

      return next;
    });
  };

  // FILTERING
  const filteredProcedures =
    procedures.filter((proc) => {

      const areaMatch =
        selectedArea === "All Areas" ||
        proc.category === selectedArea;

      const typeMatch =
        selectedType === "All" ||
        proc.type === selectedType;

      const searchMatch =
        proc.name
          .toLowerCase()
          .includes(search.toLowerCase()) ||

        proc.description
          .toLowerCase()
          .includes(search.toLowerCase());

      return (
        areaMatch &&
        typeMatch &&
        searchMatch
      );
    });

  const handleRunAnalysis = async () => {

    if (
      toggled.size === 0 ||
      !selectedFile
    ) {
      return;
    }

    try {
      setRunning(true);

      const selectedProcedureIds =
        Array.from(toggled);

      // START ANALYSIS
      const response =
        await api.analyses.start({
          file_name: selectedFile.name,

          file_path:
            selectedFile.path || "",

          columns:
            selectedFile.columns || [],

          procedure_ids:
            selectedProcedureIds,

          file_size:
            selectedFile.size,

          row_count:
            selectedFile.rowCount,
        });

      // GET CREATED ANALYSIS
      const analysis =
        await api.analyses.get(
          response.run_id
        );

      // CONVERT API FORMAT
      const convertedAnalysis =
        apiAnalysisToRun(analysis);

      // UPDATE UI
      setAnalyses((prev) => [
        convertedAnalysis,
        ...prev,
      ]);

      setActiveAnalysis(
        convertedAnalysis
      );

      // NAVIGATE
      setCurrentPage("analyses");

    } catch (err) {

      console.error(
        "Failed to run analysis:",
        err
      );

      alert(
        err instanceof Error
          ? err.message
          : "Failed to start analysis"
      );

    } finally {
      setRunning(false);
    }
  };

  if (loading) {
    return (
      <div className="p-10 text-gray-500">
        Loading procedures...
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-[#f6f7fb] overflow-hidden">

      {/* YOUR EXISTING JSX CONTINUES */}

    </div>
  );
}

