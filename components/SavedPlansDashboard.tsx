import React, { useEffect, useState, useRef } from 'react';
import backendAPI from '../services/backendAPI';
import Card from './shared/Card';
import Spinner from './shared/Spinner';
import { BookIcon, FileDownloadIcon, ShareIcon, StarIcon } from './icons';
import { SavedReport } from '../types';
import { ToastType } from './shared/Toast';
import { useToast } from '../contexts/ToastContext';

const CATEGORIES = [
  { id: 'all', label: 'All' },
  { id: 'favorite', label: 'Starred' },
  { id: 'growing-plan', label: 'Growing Plans' },
  { id: 'watering-schedule', label: 'Watering' },
  { id: 'health-analysis', label: 'Health' },
  { id: 'crop-guide', label: 'Guides' },
  { id: 'trending-advice', label: 'Advice' },
  { id: 'planting-calendar', label: 'Calendars' },
  { id: 'crop-comparison', label: 'Comparisons' },
];

interface SavedPlansDashboardProps {
  onEditPlan?: (plan: SavedReport) => void;
  onReportsRead?: () => void;
}

const SavedPlansDashboard: React.FC<SavedPlansDashboardProps> = ({ onEditPlan, onReportsRead }) => {
  const [savedPlans, setSavedPlans] = useState<SavedReport[]>([]);
  const [activePlan, setActivePlan] = useState<SavedReport | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [editingReportId, setEditingReportId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [editContent, setEditContent] = useState('');
  const [isSavingEdit, setIsSavingEdit] = useState(false);
  const [filter, setFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState('lastViewedAt');

  const deletionTimerRef = useRef<NodeJS.Timeout | null>(null);

  const { showToast } = useToast();

  const loadPlans = async () => {
    setLoading(true);
    setError('');

    try {
      const plans = await backendAPI.getReports();
      const allPlans: SavedReport[] = Array.isArray(plans) ? plans : [];
      setSavedPlans(allPlans);

      const currentFiltered = allPlans
        .filter((p) => filter === 'all' ? true : filter === 'favorite' ? (p as any).isFavorite : p.reportType === filter)
        .filter((p) => p.title.toLowerCase().includes(searchQuery.toLowerCase()));
      
      if (currentFiltered.length > 0) {
        setActivePlan(currentFiltered[0]);
      } else {
        setActivePlan(null);
      }
    } catch (err) {
      console.error('Failed to load saved growing plans:', err);
      setError('Unable to load saved plans. Please make sure you are signed in.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPlans();
    // Cleanup timer on unmount
    return () => {
      if (deletionTimerRef.current) {
        clearTimeout(deletionTimerRef.current);
      }
    };
  }, []);

  const handleDownload = (report: SavedReport) => {
    const blob = new Blob([report.content], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `${report.title.replace(/\s+/g, '_').toLowerCase()}.txt`;
    document.body.appendChild(anchor);
    anchor.click();
    document.body.removeChild(anchor);
    URL.revokeObjectURL(url);
  };

  const handleShare = async (report: SavedReport) => {
    if (!navigator.share) {
      alert('Sharing is not supported in this browser.');
      return;
    }

    try {
      await navigator.share({
        title: report.title,
        text: report.content,
      });
    } catch (error) {
      console.error('Error sharing saved plan:', error);
    }
  };

  const markAllAsRead = async () => {
    const unreadReports = savedPlans.filter((p) => !(p as any).lastViewedAt);
    if (unreadReports.length === 0) {
      showToast('No new reports to mark as read.', 'info');
      return;
    }

    setLoading(true);
    const now = new Date().toISOString();
    try {
      await Promise.all(
        unreadReports.map((report) =>
          backendAPI.updateReport(report.id, undefined, undefined, undefined, undefined, now)
        )
      );

      setSavedPlans((prev) =>
        prev.map((p) => {
          if (!(p as any).lastViewedAt) {
            return { ...p, lastViewedAt: now } as SavedReport;
          }
          return p;
        })
      );

      showToast(`${unreadReports.length} reports marked as read.`, 'success');
      // Refresh global badge count
      onReportsRead?.();
    } catch (err) {
      console.error('Failed to mark all as read:', err);
      showToast('Failed to update reports.', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleSelectReport = async (report: SavedReport) => {
    setActivePlan(report);
    
    const now = new Date().toISOString();
    try {
      // Update backend last viewed timestamp
      const updated = await backendAPI.updateReport(report.id, undefined, undefined, undefined, undefined, now);
      // Update local state to reflect the new timestamp
      setSavedPlans(prev => prev.map(p => p.id === updated.id ? updated : p));
      onReportsRead?.();
    } catch (err) {
      console.warn('Failed to update last viewed timestamp:', err);
    }
  };

  const toggleFavorite = async (report: SavedReport) => {
    const newStatus = !(report as any).isFavorite;
    try {
      const updated = await backendAPI.updateReport(report.id, undefined, undefined, undefined, newStatus);
      setSavedPlans((prev) => prev.map((p) => (p.id === updated.id ? updated : p)));
      if (activePlan?.id === report.id) setActivePlan(updated);
      showToast(newStatus ? 'Added to Starred' : 'Removed from Starred', 'success');
    } catch (err) {
      showToast('Failed to update favorite status.', 'error');
    }
  };

  const startEditing = (report: SavedReport) => {
    setEditingReportId(report.id);
    setEditTitle(report.title);
    setEditContent(report.content);
  };

  const cancelEdit = () => {
    setEditingReportId(null);
    setEditTitle('');
    setEditContent('');
  };

  const saveEdit = async () => {
    if (!editingReportId) return;
    setIsSavingEdit(true);

    try {
      const updated = await backendAPI.updateReport(editingReportId, editTitle, editContent);
      setSavedPlans((prev) => prev.map((report) => (report.id === updated.id ? updated : report)));
      setActivePlan(updated);
      setEditingReportId(null);
      setEditTitle('');
      setEditContent('');
      showToast('Plan updated successfully!', 'success');
    } catch (err) {
      console.error('Failed to update report:', err);
      showToast('Unable to save changes. Please try again.', 'error');
    } finally {
      setIsSavingEdit(false);
    }
  };

  const deletePlan = async (report: SavedReport) => {
    const shouldDelete = window.confirm(`Delete "${report.title}"? This cannot be undone.`);
    if (!shouldDelete) return;

    try {
      await backendAPI.deleteReport(report.id);

      // Use functional updates for both states to avoid race conditions and closure issues
      setSavedPlans((prevPlans) => {
        const updatedPlans = prevPlans.filter((p) => p.id !== report.id);

        // Pick new active from the soon-to-be-recalculated filtered list
        const nextFiltered = updatedPlans
          .filter((p) => filter === 'all' ? true : filter === 'favorite' ? (p as any).isFavorite : p.reportType === filter)
          .filter((p) => p.title.toLowerCase().includes(searchQuery.toLowerCase()));

        setActivePlan((prevActive) => {
          if (prevActive?.id === report.id) {
            return nextFiltered.length > 0 ? nextFiltered[0] : null;
          }
          return prevActive;
        });
        
        return updatedPlans;
      });

      if (editingReportId === report.id) {
        cancelEdit();
      }
      showToast(`"${report.title}" has been deleted.`, 'deleted');
    } catch (err) {
      console.error('Failed to delete saved plan:', err);
      // Show the actual error message from the server if available
      const msg = err instanceof Error ? err.message : 'Unable to delete plan. Please try again.';
      showToast(msg, 'error');
    }
  };

  const filteredPlans = savedPlans
    .filter((p) => filter === 'all' ? true : filter === 'favorite' ? (p as any).isFavorite : p.reportType === filter)
    .filter((p) => p.title.toLowerCase().includes(searchQuery.toLowerCase()));

  const sortedPlans = [...filteredPlans].sort((a, b) => {
    if (sortBy === 'title') {
      return a.title.localeCompare(b.title);
    }
    // Default to lastViewedAt, fallback to createdAt
    const dateA = new Date((a as any)[sortBy] || a.createdAt || 0).getTime();
    const dateB = new Date((b as any)[sortBy] || b.createdAt || 0).getTime();
    return dateB - dateA;
  });

  const openInGrowingCapacity = (report: SavedReport) => {
    onEditPlan?.(report);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-100">Saved Reports Dashboard</h2>
          <p className="text-gray-400 mt-2">Manage and review your saved AI-generated plans, schedules, and analyses.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={markAllAsRead}
            disabled={loading || savedPlans.filter(p => !(p as any).lastViewedAt).length === 0}
            className="inline-flex items-center justify-center gap-2 rounded-md bg-gray-700 px-4 py-2 text-sm font-semibold text-white hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500 focus:ring-offset-gray-900 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            Mark All Read
          </button>
          <button
            type="button"
            onClick={loadPlans}
            disabled={loading}
            className="inline-flex items-center justify-center gap-2 rounded-md bg-green-600 px-4 py-2 text-sm font-semibold text-white hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 focus:ring-offset-gray-900 disabled:opacity-50 transition-colors"
          >
            Refresh List
          </button>
        </div>
      </div>

      <Card title="Report Archive" icon={<BookIcon />}>
        <div className="mb-6 space-y-4 border-b border-gray-800 pb-4">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-grow">
              <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
                <span className="text-xs">🔍</span>
              </div>
              <input
                type="text"
                placeholder="Search reports by title..."
                value={searchQuery}
                onChange={(e) => {
                  const query = e.target.value;
                  setSearchQuery(query);
                  const nextFiltered = savedPlans
                    .filter((p) => filter === 'all' ? true : filter === 'favorite' ? (p as any).isFavorite : p.reportType === filter)
                    .filter((p) => p.title.toLowerCase().includes(query.toLowerCase()));
                  if (nextFiltered.length > 0) {
                    setActivePlan(nextFiltered[0]);
                  } else {
                    setActivePlan(null);
                  }
                }}
                className="block w-full pl-10 pr-3 py-2 border border-gray-700 rounded-lg bg-gray-900 text-gray-100 text-sm placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-green-500 focus:border-green-500 transition-all"
              />
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] uppercase font-bold text-gray-500 whitespace-nowrap">Sort By:</span>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="bg-gray-800 border border-gray-700 text-gray-200 text-xs rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-green-500 transition-all"
              >
                <option value="lastViewedAt">Recently Accessed</option>
                <option value="createdAt">Date Created</option>
                <option value="title">Alphabetical</option>
              </select>
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
          {CATEGORIES.map((cat) => (
            <button
              key={cat.id}
              onClick={() => {
                setFilter(cat.id);
                const nextFiltered = savedPlans
                  .filter((p) => cat.id === 'all' ? true : cat.id === 'favorite' ? (p as any).isFavorite : p.reportType === cat.id)
                  .filter((p) => p.title.toLowerCase().includes(searchQuery.toLowerCase()));
                if (nextFiltered.length > 0) {
                  setActivePlan(nextFiltered[0]);
                } else {
                  setActivePlan(null);
                }
              }}
              className={`px-3 py-1.5 rounded-md text-[10px] font-bold uppercase tracking-wider transition-all border ${
                filter === cat.id
                  ? 'bg-green-600 border-green-500 text-white shadow-lg shadow-green-900/20'
                  : 'bg-gray-800 border-gray-700 text-gray-400 hover:border-gray-500 hover:text-gray-200'
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>
        </div>

        {loading ? (
          <div className="flex justify-center py-12">
            <Spinner />
          </div>
        ) : error ? (
          <p className="text-red-400">{error}</p>
        ) : sortedPlans.length === 0 ? (
          <p className="text-gray-400 py-12 text-center bg-gray-800/10 rounded-xl border border-dashed border-gray-700">No {filter === 'all' ? '' : filter.replace('-', ' ')} reports {searchQuery ? ` matching "${searchQuery}"` : ''} found in your archive.</p>
        ) : (
          <div className="grid gap-4 lg:grid-cols-[320px_1fr]">
            <div className="space-y-3 max-h-[60vh] overflow-y-auto pr-1">
              {sortedPlans.map((report) => (
                <div
                  key={report.id}
                  className={`rounded-xl border px-4 py-3 transition ${activePlan?.id === report.id ? 'border-green-400 bg-gray-800' : 'border-gray-700 bg-gray-900 hover:border-gray-500'}`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <button
                      type="button"
                      onClick={() => handleSelectReport(report)}
                      className="text-left flex-1"
                    >
                      <div className="flex items-center gap-2">
                        <p className="font-semibold text-gray-100">{report.title}</p>
                        {!(report as any).lastViewedAt && (
                          <span className="inline-flex items-center rounded-full bg-blue-500/10 px-1.5 py-0.5 text-[9px] font-bold text-blue-400 border border-blue-500/20 uppercase tracking-tighter">
                            New
                          </span>
                        )}
                      </div>
                      <p className="text-[10px] uppercase font-bold tracking-wider text-green-400 mt-0.5">{report.reportType.replace('-', ' ')}</p>
                      <p className="text-[10px] text-gray-500 mt-1">
                        { (report as any).lastViewedAt 
                          ? `Accessed ${new Date((report as any).lastViewedAt).toLocaleDateString()}` 
                          : `Saved ${new Date(report.createdAt || '').toLocaleDateString()}` }
                      </p>
                    </button>
                    <button
                      onClick={() => toggleFavorite(report)}
                      className={`p-1 rounded-full transition-colors ${(report as any).isFavorite ? 'text-amber-400 hover:text-amber-300' : 'text-gray-600 hover:text-gray-400'}`}
                      title={(report as any).isFavorite ? "Unstar" : "Star"}
                    >
                      <StarIcon filled={(report as any).isFavorite} />
                    </button>
                  </div>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {report.reportType === 'growing-plan' && (
                      <button
                        type="button"
                        onClick={() => openInGrowingCapacity(report)}
                        className="rounded-md bg-blue-600 px-3 py-1 text-xs font-semibold text-white hover:bg-blue-700"
                      >
                        Open in Growing Capacity
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => startEditing(report)}
                      className="rounded-md bg-yellow-600 px-3 py-1 text-xs font-semibold text-white hover:bg-yellow-700"
                    >
                      Edit
                    </button>
                    <button
                      type="button"
                      onClick={() => deletePlan(report)}
                      className="rounded-md bg-red-600 px-3 py-1 text-xs font-semibold text-white hover:bg-red-700"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              ))}
            </div>

            <div className="rounded-xl border border-gray-700 bg-gray-900 p-4">
              {activePlan ? (
                <>
                  <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 mb-4">
                    <div>
                      <p className="text-lg font-semibold text-gray-100">{activePlan.title}</p>
                      <p className="text-sm text-gray-400 mt-1">{new Date(activePlan.createdAt || '').toLocaleString()}</p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <button
                        onClick={() => toggleFavorite(activePlan)}
                        className={`p-2 rounded-md border transition-all ${(activePlan as any).isFavorite ? 'bg-amber-500/10 border-amber-500/50 text-amber-400' : 'bg-gray-800 border-gray-700 text-gray-400 hover:text-white'}`}
                        title={(activePlan as any).isFavorite ? "Remove from Starred" : "Add to Starred"}
                      >
                        <StarIcon filled={(activePlan as any).isFavorite} className="h-4 w-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDownload(activePlan)}
                        className="inline-flex items-center gap-2 rounded-md bg-gray-700 px-3 py-2 text-xs font-semibold text-white hover:bg-gray-600"
                      >
                        <FileDownloadIcon /> Download
                      </button>
                      <button
                        type="button"
                        onClick={() => handleShare(activePlan)}
                        className="inline-flex items-center gap-2 rounded-md bg-blue-600 px-3 py-2 text-xs font-semibold text-white hover:bg-blue-700"
                      >
                        <ShareIcon /> Share
                      </button>
                      {activePlan.reportType === 'growing-plan' && (
                        <button
                          type="button"
                          onClick={() => openInGrowingCapacity(activePlan)}
                          className="inline-flex items-center gap-2 rounded-md bg-green-600 px-3 py-2 text-xs font-semibold text-white hover:bg-green-700"
                        >
                          Open in Growing Capacity
                        </button>
                      )}
                    </div>
                  </div>
                  {editingReportId === activePlan.id ? (
                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-300">Title</label>
                        <input
                          type="text"
                          value={editTitle}
                          onChange={(e) => setEditTitle(e.target.value)}
                          className="mt-1 block w-full rounded-md border border-gray-600 bg-gray-800 px-3 py-2 text-white focus:border-green-500 focus:outline-none focus:ring-green-500"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-300">Content</label>
                        <textarea
                          value={editContent}
                          onChange={(e) => setEditContent(e.target.value)}
                          rows={10}
                          className="mt-1 block w-full rounded-md border border-gray-600 bg-gray-800 px-3 py-2 text-white focus:border-green-500 focus:outline-none focus:ring-green-500"
                        />
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <button
                          type="button"
                          onClick={saveEdit}
                          disabled={isSavingEdit}
                          className="rounded-md bg-green-600 px-3 py-2 text-xs font-semibold text-white hover:bg-green-700 disabled:opacity-50"
                        >
                          {isSavingEdit ? 'Saving...' : 'Save Changes'}
                        </button>
                        <button
                          type="button"
                          onClick={cancelEdit}
                          className="rounded-md bg-gray-700 px-3 py-2 text-xs font-semibold text-white hover:bg-gray-600"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="max-h-[48vh] overflow-y-auto rounded-xl border border-gray-800 bg-slate-950 p-4 text-sm leading-relaxed text-gray-200 whitespace-pre-wrap">
                      {activePlan.content}
                    </div>
                  )}
                </>
              ) : (
                <p className="text-gray-400">Select a plan to preview its full content.</p>
              )}
            </div>
          </div>
        )}
      </Card>
    </div>
  );
};

export default SavedPlansDashboard;
