import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { describe, expect, it } from 'vitest'
import { MtpBenchmarkResult } from '@/raw/mtpBenchmark'

describe('raw RTX 3080 MTP benchmark results', () => {
  it('constructs state from qualitative speed MTP OSL 1024 results', () => {
    const filePath = path.resolve(
      process.cwd(),
      'public',
      'benchmark-cache',
      'nvidia-rtx-3080',
      'mtp-throughput-memory-profiles',
      'raw',
      'speed',
      'mtp_n1_qualitative_all_osl1024.json',
    )
    const result = new MtpBenchmarkResult(filePath)

    expect(result).toBeInstanceOf(MtpBenchmarkResult)
    expect(result.jsonFilePath).toBe(filePath)
    expect(result.completedSamples).toBe(880)
    expect(result.failedSamples).toBe(0)
    expect(result.selectedSamples).toBe(880)
    expect(result.config).toEqual({
      bench: 'qualitative',
      category: 'all',
      concurrency: 1,
      extraInputs: {
        temperature: 0,
      },
      model: null,
      osl: 1024,
      url: 'localhost:8080',
    })
    expect(result.results).toHaveLength(880)
    expect(result.results[0]).toMatchObject({
      category: 'coding',
      completionTokens: 354,
      draftN: 186,
      draftNAccepted: 167,
      error: null,
      finishReason: 'stop',
      id: '0daf539b787c4dccbb547330a8b4c3d7',
      ok: true,
      promptTokens: 59,
      totalTokens: 413,
      turns: 1,
    })
    expect(result.results[0].latencyS).toBeCloseTo(4.583477000007406, 12)
    expect(result.results[0].predictedPerSecond).toBeCloseTo(159.65096870705716, 12)
    expect(result.summary.at(-1)).toMatchObject({
      category: 'overall',
      accepted: 272643,
      draftN: 332650,
      failed: 0,
      requests: 880,
      turns: 1036,
    })
    expect(result.summary.at(-1)?.acceptRate).toBeCloseTo(0.8196091988576581, 12)
    expect(Object.isFrozen(result.config)).toBe(true)
    expect(Object.isFrozen(result.config.extraInputs)).toBe(true)
    expect(Object.isFrozen(result.results)).toBe(true)
    expect(Object.isFrozen(result.results[0])).toBe(true)
    expect(Object.isFrozen(result.summary)).toBe(true)
    expect(Object.isFrozen(result.summary[0])).toBe(true)
  })

  it('constructs state from high entropy throughput speed MTP OSL 1024 results', () => {
    const filePath = path.resolve(
      process.cwd(),
      'public',
      'benchmark-cache',
      'nvidia-rtx-3080',
      'mtp-throughput-memory-profiles',
      'raw',
      'speed',
      'mtp_n1_throughput_1k_high_entropy_osl1024.json',
    )
    const result = new MtpBenchmarkResult(filePath)

    expect(result).toBeInstanceOf(MtpBenchmarkResult)
    expect(result.jsonFilePath).toBe(filePath)
    expect(result.completedSamples).toBe(50)
    expect(result.failedSamples).toBe(0)
    expect(result.selectedSamples).toBe(50)
    expect(result.config).toEqual({
      bench: 'throughput_1k',
      category: 'high_entropy',
      concurrency: 1,
      extraInputs: {
        temperature: 0,
      },
      model: null,
      osl: 1024,
      url: 'localhost:8080',
    })
    expect(result.results).toHaveLength(50)
    expect(result.results[0]).toMatchObject({
      category: 'high_entropy',
      completionTokens: 1024,
      draftN: 552,
      draftNAccepted: 470,
      error: null,
      finishReason: 'length',
      id: 'fa1dbdf2565a4fa6b0738fd851e2f253',
      ok: true,
      promptTokens: 1035,
      totalTokens: 2059,
      turns: 1,
    })
    expect(result.results[0].latencyS).toBeCloseTo(8.861502499989001, 12)
    expect(result.results[0].predictedPerSecond).toBeCloseTo(163.76458968174336, 12)
    expect(result.summary).toHaveLength(2)
    expect(result.summary[0]).toMatchObject({
      category: 'high_entropy',
      accepted: 21500,
      draftN: 26936,
      failed: 0,
      requests: 50,
      turns: 50,
    })
    expect(result.summary[0].acceptRate).toBeCloseTo(0.7981882981882982, 12)
    expect(result.summary[1]).toMatchObject({
      category: 'overall',
      accepted: 21500,
      draftN: 26936,
      failed: 0,
      requests: 50,
      turns: 50,
    })
    expect(Object.isFrozen(result.config)).toBe(true)
    expect(Object.isFrozen(result.config.extraInputs)).toBe(true)
    expect(Object.isFrozen(result.results)).toBe(true)
    expect(Object.isFrozen(result.results[0])).toBe(true)
    expect(Object.isFrozen(result.summary)).toBe(true)
    expect(Object.isFrozen(result.summary[0])).toBe(true)
  })

  it('loads qualitative MTP token results from a JSON path', () => {
    const filePath = path.resolve(
      process.cwd(),
      'public',
      'benchmark-cache',
      'nvidia-rtx-3080',
      'mtp-throughput-memory-profiles',
      'raw',
      'memory',
      'mtp_n1_qualitative_all_osl1024_tokens.json',
    )
    const result = new MtpBenchmarkResult(filePath)

    expect(result).toBeInstanceOf(MtpBenchmarkResult)
    expect(result.jsonFilePath).toBe(filePath)
    expect(result.completedSamples).toBe(11)
    expect(result.failedSamples).toBe(0)
    expect(result.config.bench).toBe('qualitative')
    expect(result.config.category).toBe('all')
    expect(result.config.osl).toBe(1024)
    expect(result.results[0]).toMatchObject({
      category: 'coding',
      completionTokens: 354,
      draftN: 186,
      draftNAccepted: 167,
      ok: true,
    })
    expect(result.summary.at(-1)).toMatchObject({
      category: 'overall',
      requests: 11,
      turns: 15,
    })
    expect(Object.isFrozen(result.config)).toBe(true)
    expect(Object.isFrozen(result.results)).toBe(true)
    expect(Object.isFrozen(result.results[0])).toBe(true)
  })

  it('loads throughput MTP results from a JSON path', () => {
    const filePath = path.resolve(
      process.cwd(),
      'public',
      'benchmark-cache',
      'nvidia-rtx-3080',
      'mtp-throughput-memory-profiles',
      'raw',
      'speed',
      'mtp_n1_throughput_1k_high_entropy_osl2048.json',
    )
    const result = new MtpBenchmarkResult(filePath)

    expect(result).toBeInstanceOf(MtpBenchmarkResult)
    expect(result.config.bench).toBe('throughput_1k')
    expect(result.config.category).toBe('high_entropy')
    expect(result.completedSamples).toBe(50)
    expect(result.selectedSamples).toBe(50)
    expect(result.results).toHaveLength(50)
    expect(result.summary[0]).toMatchObject({
      category: 'high_entropy',
      requests: 50,
      turns: 50,
    })
  })

  it('rejects an unknown MTP benchmark config type', () => {
    const sourcePath = path.resolve(
      process.cwd(),
      'public',
      'benchmark-cache',
      'nvidia-rtx-3080',
      'mtp-throughput-memory-profiles',
      'raw',
      'speed',
      'mtp_n1_throughput_1k_high_entropy_osl2048.json',
    )
    const tempDir = mkdtempSync(path.join(os.tmpdir(), 'mtp-benchmark-'))
    const tempPath = path.join(tempDir, 'unknown-bench.json')

    try {
      const benchmark = JSON.parse(readFileSync(sourcePath, 'utf8')) as {
        config: { bench: string }
      }
      benchmark.config.bench = 'latency_1k'
      writeFileSync(tempPath, JSON.stringify(benchmark), 'utf8')

      expect(() => new MtpBenchmarkResult(tempPath)).toThrow(
        'Expected "bench" to be qualitative or throughput MTP data',
      )
    } finally {
      rmSync(tempDir, { recursive: true, force: true })
    }
  })

  it('rejects MTP results that contradict the selected config category', () => {
    const sourcePath = path.resolve(
      process.cwd(),
      'public',
      'benchmark-cache',
      'nvidia-rtx-3080',
      'mtp-throughput-memory-profiles',
      'raw',
      'speed',
      'mtp_n1_throughput_1k_high_entropy_osl2048.json',
    )
    const tempDir = mkdtempSync(path.join(os.tmpdir(), 'mtp-benchmark-'))
    const tempPath = path.join(tempDir, 'contradictory-category.json')

    try {
      const benchmark = JSON.parse(readFileSync(sourcePath, 'utf8')) as {
        results: Array<{ category: string }>
      }
      benchmark.results[0].category = 'low_entropy'
      writeFileSync(tempPath, JSON.stringify(benchmark), 'utf8')

      expect(() => new MtpBenchmarkResult(tempPath)).toThrow(
        'to match config category "high_entropy"',
      )
    } finally {
      rmSync(tempDir, { recursive: true, force: true })
    }
  })
})
