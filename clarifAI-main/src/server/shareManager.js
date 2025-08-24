import crypto from 'crypto';

// In-memory storage for shared links (use database in production)
const sharedLinks = new Map();

// Cleanup expired links every 10 minutes
setInterval(() => {
  const now = Date.now();
  for (const [shareId, linkData] of sharedLinks.entries()) {
    if (linkData.expiresAt < now) {
      sharedLinks.delete(shareId);
      console.log(`Expired share link deleted: ${shareId}`);
    }
  }
}, 10 * 60 * 1000);

export function createShareLink(data, fileName, allowDownload, expiryHours) {
  const shareId = crypto.randomBytes(16).toString('hex');
  const expiresAt = Date.now() + (expiryHours * 60 * 60 * 1000);
  
  // Encrypt data for security
  const encryptedData = Buffer.from(JSON.stringify(data)).toString('base64');
  
  const linkData = {
    shareId,
    encryptedData,
    fileName,
    allowDownload,
    expiresAt,
    createdAt: Date.now(),
    accessCount: 0
  };
  
  sharedLinks.set(shareId, linkData);
  
  console.log(`Share link created: ${shareId}, expires: ${new Date(expiresAt)}`);
  
  return {
    shareId,
    expiresAt,
    success: true
  };
}

export function getSharedData(shareId) {
  const linkData = sharedLinks.get(shareId);
  
  if (!linkData) {
    return { error: 'Share link not found', status: 404 };
  }
  
  if (linkData.expiresAt < Date.now()) {
    sharedLinks.delete(shareId);
    return { error: 'Share link has expired', status: 410 };
  }
  
  // Increment access count
  linkData.accessCount++;
  
  // Decrypt data
  const data = JSON.parse(Buffer.from(linkData.encryptedData, 'base64').toString());
  
  return {
    data,
    fileName: linkData.fileName,
    allowDownload: linkData.allowDownload,
    expiresAt: linkData.expiresAt,
    accessCount: linkData.accessCount,
    success: true
  };
}

export function getShareStats() {
  const now = Date.now();
  const activeLinks = Array.from(sharedLinks.values()).filter(link => link.expiresAt > now);
  
  return {
    totalActive: activeLinks.length,
    totalAccesses: activeLinks.reduce((sum, link) => sum + link.accessCount, 0)
  };
}