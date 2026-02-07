const jobStore = require("../store/jobStore");

const { moveFile } = require("./transferService");
const { listFolderChildren } = require("./folderService");
const { createDestinationFolder } = require("./destinationService");
const { deleteSourceFolderSafe } = require("./deleteService");

/**
 * ✅ Recursively move a folder (all files + subfolders)
 */
async function moveFolderRecursive(jobId, sourceFolderId, destParentId) {
    const children = await listFolderChildren(sourceFolderId);

    for (let item of children) {
        try {
            // 📂 Folder → recurse
            if (item.mimeType === "application/vnd.google-apps.folder") {
                console.log("📂 Folder:", item.name);

                // Create folder in destination
                const newDestFolderId = await createDestinationFolder(
                    item.name,
                    destParentId
                );

                // Recurse
                await moveFolderRecursive(jobId, item.id, newDestFolderId);
            } else {
                const job = jobStore.getJob(jobId);

                if (job.movedFiles.includes(item.id)) {
                    console.log("⏭️ Skipping already moved:", item.name);
                    continue;
                }
                // 📄 File → move
                await moveFile(item);


                job.movedFiles.push(item.id);

                jobStore.updateJob(jobId, {
                    completed: job.completed + 1,
                    movedFiles: job.movedFiles,
                });

                console.log("✅ Moved file:", item.name);
            }
        } catch (err) {
            console.log("❌ Failed:", item.name);

            const job = jobStore.getJob(jobId);
            job.failed.push(item.name);

            jobStore.updateJob(jobId, {
                failed: job.failed,
            });
        }
    }
}

/**
 * ✅ Main Transfer Job Runner
 */
async function runTransferJob(jobId, rootFolderId, deleteSource) {
    console.log("🚀 Starting full recursive transfer...");

    // Create root folder in destination
    const rootDestFolderId = await createDestinationFolder(
        "GDriveBridge_Transfer"
    );

    // Move everything recursively
    await moveFolderRecursive(jobId, rootFolderId, rootDestFolderId);

    // Mark job complete
    jobStore.updateJob(jobId, {
        status: "completed",
        finishedAt: new Date().toISOString(),
    });

    console.log("🎉 Entire Folder Migration Completed!");

    // ✅ Optional Safe Cleanup
    if (deleteSource) {
        const job = jobStore.getJob(jobId);

        // 🚫 Do not delete if failures happened
        if (job.failed.length > 0) {
            console.log("⚠️ Transfer had failures, skipping delete");
            return;
        }

        console.log("🧹 Cleaning up Source Folder safely...");

        const deleted = await deleteSourceFolderSafe(rootFolderId);

        if (deleted) {
            console.log("✅ Source Folder Deleted After Transfer");
        } else {
            console.log("⚠️ Source Folder still has items, not deleted");
        }
    }
}

module.exports = { runTransferJob };
