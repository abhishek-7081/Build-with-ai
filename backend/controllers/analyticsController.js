import { queryComplaints } from '../config/db.js';

export async function getAnalyticsData(req, res) {
  try {
    const complaints = await queryComplaints();
    
    // Compute heatmap points
    const heatmapPoints = complaints
      .filter(c => c.locationCoords && c.locationCoords.lat && c.locationCoords.lng)
      .map(c => {
        let intensity = 0.4;
        if (c.severity === 'Medium') intensity = 0.6;
        if (c.severity === 'High') intensity = 0.8;
        if (c.severity === 'Critical') intensity = 1.0;
        return [c.locationCoords.lat, c.locationCoords.lng, intensity];
      });

    res.json({
      total: complaints.length,
      pending: complaints.filter(c => c.status === 'Pending').length,
      inProgress: complaints.filter(c => c.status === 'In Progress').length,
      resolved: complaints.filter(c => c.status === 'Resolved').length,
      rejected: complaints.filter(c => c.status === 'Rejected').length,
      heatmapPoints,
      complaints
    });
  } catch (error) {
    console.error('Failed to get analytics data:', error);
    res.status(500).json({ error: 'Failed to compile analytics.' });
  }
}
