
/**
 * Formats a date to Nigerian Time (WAT - UTC+1)
 */
export function formatToWAT(date: Date | string | number, options?: Intl.DateTimeFormatOptions): string {
  const d = new Date(date);
  return d.toLocaleString('en-NG', {
    timeZone: 'Africa/Lagos',
    ...options
  });
}

/**
 * Checks if a date is in the past relative to current Nigerian Time
 */
export function isPast(date: Date | string | number): boolean {
  const d = new Date(date);
  const now = new Date();
  return d < now;
}

/**
 * Gets the current date/time in Nigeria
 */
export function getNowInWAT(): Date {
  // Since new Date() always returns UTC, we can compare directly 
  // but display needs the offset.
  return new Date();
}

/**
 * Gets the course creation date based on created_at, createdAt, objectId or scheduled_date
 */
export const getCourseCreationDate = (course: any): Date => {
  if (course.created_at) return new Date(course.created_at);
  if (course.createdAt) return new Date(course.createdAt);
  
  const idStr = String(course.id || course._id || '');
  if (idStr.length === 24) {
    const timestampSec = parseInt(idStr.substring(0, 8), 16);
    if (!isNaN(timestampSec)) {
      return new Date(timestampSec * 1000);
    }
  }
  if (course.scheduled_date) {
    return new Date(course.scheduled_date);
  }
  return new Date();
};

/**
 * Maps a course to its designated week slot
 */
export const getWeekForCourse = (course: any): { number: number; label: string; range: string } => {
  const date = getCourseCreationDate(course);
  const time = date.getTime();
  
  const wk1Start = new Date("2026-05-10T00:00:00").getTime();
  const wk1End = new Date("2026-05-17T23:59:59").getTime();
  
  const wk2Start = new Date("2026-05-18T00:00:00").getTime();
  const wk2End = new Date("2026-05-24T23:59:59").getTime();
  
  const wk3Start = new Date("2026-05-25T00:00:00").getTime();
  const wk3End = new Date("2026-05-31T23:59:59").getTime();
  
  if (time >= wk1Start && time <= wk1End) {
    return { number: 1, label: "Week 1", range: "May 10 to May 17" };
  }
  if (time >= wk2Start && time <= wk2End) {
    return { number: 2, label: "Week 2", range: "May 18 to May 24" };
  }
  if (time >= wk3Start && time <= wk3End) {
    return { number: 3, label: "Week 3", range: "May 25 to May 31" };
  }
  
  if (time < wk1Start) {
    return { number: 1, label: "Week 1", range: "May 10 to May 17" };
  }
  
  const anchorTime = new Date("2026-06-01T00:00:00").getTime();
  const msPerWeek = 7 * 24 * 60 * 60 * 1000;
  
  const diffMs = time - anchorTime;
  const index = Math.floor(diffMs / msPerWeek);
  const wkNumber = 4 + index;
  
  const wkStart = new Date(anchorTime + index * msPerWeek);
  const wkEnd = new Date(anchorTime + (index + 1) * msPerWeek - 1);
  
  const formatOption: Intl.DateTimeFormatOptions = { month: 'short', day: 'numeric' };
  const rangeStr = `${wkStart.toLocaleDateString('en-US', formatOption)} to ${wkEnd.toLocaleDateString('en-US', formatOption)}`;
  
  return { number: wkNumber, label: `Week ${wkNumber}`, range: rangeStr };
};
