import Activity from "@/models/Activity";

/**
 * Create an activity log entry
 * @param {Object} params
 * @param {string} params.boardId - Board ID
 * @param {string} params.userId - User ID who performed the action
 * @param {string} params.type - Activity type
 * @param {string} params.description - Human-readable description
 * @param {Object} params.metadata - Additional metadata
 */
export async function createActivity({
  boardId,
  userId,
  type,
  description,
  metadata = {},
}) {
  try {
    const activity = await Activity.create({
      board: boardId,
      user: userId,
      type,
      description,
      metadata,
    });

    return activity;
  } catch (error) {
    // Silently fail - activity logging shouldn't break the app
    return null;
  }
}

/**
 * Get activities for a board
 * @param {string} boardId - Board ID
 * @param {number} limit - Maximum number of activities to return
 * @returns {Promise<Array>}
 */
export async function getBoardActivities(boardId, limit = 50) {
  try {
    const activities = await Activity.find({ board: boardId })
      .populate("user", "name email avatar")
      .sort({ createdAt: -1 })
      .limit(limit);

    return activities;
  } catch (error) {
    return [];
  }
}

