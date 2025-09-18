export class PerformanceTracer {
  constructor(requestId = null) {
    this.requestId = requestId || `req_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;
    this.startTime = performance.now();
    this.phases = new Map();
    this.currentPhase = null;
    this.metadata = {};
  }

  // Start a new phase
  startPhase(phaseName, metadata = {}) {
    const now = performance.now();

    // End current phase if one is running
    if (this.currentPhase) {
      this.endPhase();
    }

    this.currentPhase = {
      name: phaseName,
      startTime: now,
      metadata: { ...metadata }
    };

    console.log(`⏱️  [${this.requestId}] Starting: ${phaseName}`, metadata);
    return this;
  }

  // End current phase
  endPhase(additionalMetadata = {}) {
    if (!this.currentPhase) {
      console.warn(`⚠️  [${this.requestId}] No active phase to end`);
      return this;
    }

    const now = performance.now();
    const duration = now - this.currentPhase.startTime;

    const phaseResult = {
      name: this.currentPhase.name,
      duration: Math.round(duration * 100) / 100, // Round to 2 decimals
      startTime: this.currentPhase.startTime,
      endTime: now,
      metadata: {
        ...this.currentPhase.metadata,
        ...additionalMetadata
      }
    };

    this.phases.set(this.currentPhase.name, phaseResult);

    console.log(`⏱️  [${this.requestId}] Completed: ${this.currentPhase.name} (${phaseResult.duration}ms)`, additionalMetadata);

    this.currentPhase = null;
    return this;
  }

  // Add metadata to current request
  addMetadata(key, value) {
    this.metadata[key] = value;
    return this;
  }

  // Get total duration so far
  getTotalDuration() {
    return Math.round((performance.now() - this.startTime) * 100) / 100;
  }

  // Generate comprehensive performance report
  getReport() {
    // Force end current phase if still running
    if (this.currentPhase) {
      this.endPhase({ incomplete: true });
    }

    const totalDuration = this.getTotalDuration();
    const phases = Array.from(this.phases.values());

    // Calculate breakdown percentages
    const phasesWithPercentage = phases.map(phase => ({
      ...phase,
      percentage: Math.round((phase.duration / totalDuration) * 100)
    }));

    return {
      requestId: this.requestId,
      totalDuration,
      totalDurationFormatted: `${totalDuration}ms`,
      phases: phasesWithPercentage,
      metadata: this.metadata,
      summary: this.generateSummary(phasesWithPercentage, totalDuration)
    };
  }

  // Generate human-readable summary
  generateSummary(phases, totalDuration) {
    const phaseCount = phases.length;
    const slowestPhase = phases.reduce((max, phase) =>
      phase.duration > max.duration ? phase : max, phases[0]);

    const claudePhases = phases.filter(p =>
      p.name.includes('claude') || p.name.includes('stream'));
    const claudeDuration = claudePhases.reduce((sum, p) => sum + p.duration, 0);

    return {
      phaseCount,
      slowestPhase: slowestPhase ? {
        name: slowestPhase.name,
        duration: slowestPhase.duration,
        percentage: slowestPhase.percentage
      } : null,
      claudeTotalDuration: Math.round(claudeDuration * 100) / 100,
      claudePercentage: Math.round((claudeDuration / totalDuration) * 100),
      efficiency: totalDuration < 3000 ? 'excellent' :
                 totalDuration < 6000 ? 'good' :
                 totalDuration < 10000 ? 'fair' : 'poor'
    };
  }

  // Log final performance report
  logReport() {
    const report = this.getReport();

    console.log(`\n📊 Performance Report [${report.requestId}]`);
    console.log(`⏱️  Total Duration: ${report.totalDurationFormatted}`);
    console.log(`🎯 Efficiency: ${report.summary.efficiency}`);

    if (report.summary.slowestPhase) {
      console.log(`🐌 Slowest Phase: ${report.summary.slowestPhase.name} (${report.summary.slowestPhase.duration}ms, ${report.summary.slowestPhase.percentage}%)`);
    }

    console.log(`🤖 Claude Processing: ${report.summary.claudeTotalDuration}ms (${report.summary.claudePercentage}%)`);

    console.log(`\n📈 Phase Breakdown:`);
    report.phases.forEach(phase => {
      const icon = phase.percentage > 30 ? '🔴' : phase.percentage > 15 ? '🟡' : '🟢';
      console.log(`  ${icon} ${phase.name}: ${phase.duration}ms (${phase.percentage}%)`);

      // Log interesting metadata
      if (Object.keys(phase.metadata).length > 0) {
        const relevantMeta = Object.entries(phase.metadata)
          .filter(([key, value]) => key !== 'incomplete' && value !== undefined)
          .map(([key, value]) => `${key}: ${value}`)
          .join(', ');
        if (relevantMeta) {
          console.log(`    📝 ${relevantMeta}`);
        }
      }
    });

    return report;
  }

  // Create child tracer for sub-operations
  createChild(childName) {
    const childId = `${this.requestId}_${childName}`;
    const child = new PerformanceTracer(childId);
    child.addMetadata('parent', this.requestId);
    return child;
  }

  // Static method to wrap async operations with timing
  static async timeAsync(phaseName, asyncFn, tracer = null) {
    const useTracer = tracer || new PerformanceTracer();

    useTracer.startPhase(phaseName);
    try {
      const result = await asyncFn();
      useTracer.endPhase({ success: true });
      return result;
    } catch (error) {
      useTracer.endPhase({
        success: false,
        error: error.message,
        errorType: error.constructor.name
      });
      throw error;
    }
  }

  // Static method for simple timing without phases
  static async simpleTime(label, asyncFn) {
    const start = performance.now();
    try {
      const result = await asyncFn();
      const duration = Math.round((performance.now() - start) * 100) / 100;
      console.log(`⏱️  ${label}: ${duration}ms`);
      return result;
    } catch (error) {
      const duration = Math.round((performance.now() - start) * 100) / 100;
      console.log(`⏱️  ${label}: ${duration}ms (failed: ${error.message})`);
      throw error;
    }
  }
}