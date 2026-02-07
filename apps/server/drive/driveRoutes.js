const express = require("express");
const router = express.Router();
const { listSourceFolders, listFilesInSourceFolder } = require("./driveService");
const jobStore = require("../store/jobStore");
const { runTransferJob } = require("./transferJob");


/**
 * GET /drive/source/folders
 */
router.get("/source/folders", async (req, res) => {
  try {
    const folders = await listSourceFolders();

    res.json({
      success: true,
      folders,
    });
  } catch (err) {
    res.status(401).json({
      success: false,
      error: err.message,
    });
  }
});
/**
 * GET /drive/source/folder/:id/files
 */
router.get("/source/folder/:id/files", async (req, res) => {
  try {
    const folderId = req.params.id;

    const files = await listFilesInSourceFolder(folderId);

    res.json({
      success: true,
      folderId,
      files,
    });
  } catch (err) {
    res.status(401).json({
      success: false,
      error: err.message,
    });
  }
});
/**
 * POST /drive/transfer/start
 * Body: { folderId: "..." }
 */
router.post("/transfer/start", async (req, res) => {
  try {
    const { folderId, deleteSource } = req.body;

    const files = await listFilesInSourceFolder(folderId);

    const jobId = jobStore.createJob(folderId, files.length);

    // Pass deleteSource option
    runTransferJob(jobId, folderId, deleteSource);

    res.json({
      success: true,
      message: "Transfer started in background",
      jobId,
      deleteSource,
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      error: err.message,
    });
  }
});
/**
 * POST /drive/transfer/resume/:jobId
 */
router.post("/transfer/resume/:jobId", async (req, res) => {
  const jobId = req.params.jobId;

  const job = jobStore.getJob(jobId);

  if (!job) {
    return res.status(404).json({
      success: false,
      error: "Job not found",
    });
  }

  if (job.status === "completed") {
    return res.json({
      success: true,
      message: "Job already completed",
    });
  }

  // Resume background job
  runTransferJob(jobId, job.folderId, false);

  res.json({
    success: true,
    message: "Transfer resumed",
    jobId,
  });
});

/**
 * GET /drive/transfer/status/:jobId
 */
router.get("/transfer/status/:jobId", (req, res) => {
  const job = jobStore.getJob(req.params.jobId);

  if (!job) {
    return res.status(404).json({
      success: false,
      error: "Job not found",
    });
  }

  res.json({
    success: true,
    job,
  });
});

module.exports = router;
