const fs = require("fs");
const path = require("path");

const jobFile = path.join(__dirname, "../jobs/jobs.json");

/**
 * ✅ Safe Job Loader
 * Handles empty/corrupt JSON file
 */
function loadJobs() {
  try {
    if (!fs.existsSync(jobFile)) return {};

    const data = fs.readFileSync(jobFile, "utf-8");

    if (!data.trim()) return {}; // handle empty file

    return JSON.parse(data);
  } catch (err) {
    console.error("⚠️ jobs.json corrupted, resetting...");
    return {};
  }
}

/**
 * ✅ Save all jobs safely
 */
function saveJobs(jobs) {
  fs.writeFileSync(jobFile, JSON.stringify(jobs, null, 2));
}

/**
 * ✅ Create new transfer job
 */
function createJob(folderId, totalFiles) {
  const jobs = loadJobs();

  const jobId = "job_" + Date.now();

  jobs[jobId] = {
  jobId,
  folderId,
  totalFiles,
  completed: 0,
  failed: [],

  movedFiles: [], // ✅ NEW (for Resume Support)

  status: "running",
  startedAt: new Date().toISOString(),
};


  saveJobs(jobs);

  return jobId;
}

/**
 * ✅ Update job progress
 */
function updateJob(jobId, updates) {
  const jobs = loadJobs();

  jobs[jobId] = { ...jobs[jobId], ...updates };

  saveJobs(jobs);
}

/**
 * ✅ Get job status
 */
function getJob(jobId) {
  const jobs = loadJobs();
  return jobs[jobId];
}

module.exports = {
  createJob,
  updateJob,
  getJob,
};
