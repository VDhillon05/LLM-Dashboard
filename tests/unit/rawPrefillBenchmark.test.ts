import path from 'node:path'
import { describe, expect, it } from 'vitest'
import {
  BenchmarkModel,
  BenchmarkResult,
  MemoryProfile,
  MemoryTimeSeries,
  PrefillBenchmarkResult,
} from '@/types/benchmark'

function readRawPrefillBenchmark(filename: string): PrefillBenchmarkResult {
  const filePath = path.resolve(
    process.cwd(),
    'public',
    'benchmark-cache',
    'nvidia-rtx-3080',
    'prefill',
    'raw',
    filename,
  )
  return new PrefillBenchmarkResult(filePath)
}

describe('raw RTX 3080 prefill benchmark results', () => {
  it('extracts the Llama prefill benchmark result into the benchmark model classes', async () => {
    const result = readRawPrefillBenchmark(
      'Llama-3.2-3B-Instruct-Q8_0_p1024_b2048_ub1024_n0_r100.json',
    )

    expect(result).toBeInstanceOf(PrefillBenchmarkResult)
    expect(result).toBeInstanceOf(BenchmarkResult)
    expect(result.jsonFilePath).toContain(
      'Llama-3.2-3B-Instruct-Q8_0_p1024_b2048_ub1024_n0_r100.json',
    )
    expect(result.model).toBeInstanceOf(BenchmarkModel)
    expect(result.model.modelType).toBe('llama 3B Q8_0')
    expect(result.model.modelSize).toBe(3414061312)
    expect(result.model.modelNParams).toBe(3212749888)
    expect(result.gpuInfo).toBe('NVIDIA GeForce RTX 3080')
    expect(result.nPrompt).toBe(1024)
    expect(result.nDepth).toBe(0)
    expect(result.nBatch).toBe(2048)
    expect(result.nUbatch).toBe(1024)
    expect(result.testTime).toBe('2026-07-28T23:39:14Z')
    expect(result.avgNs).toBe(95260653)
    expect(result.stddevNs).toBe(437382)
    expect(result.avgTs).toBeCloseTo(10749.674264, 6)
    expect(result.stddevTs).toBeCloseTo(48.481576, 6)
    expect(result.samplesNs[0]).toBe(98505100)
    expect(result.samplesTs[0]).toBeCloseTo(10395.4, 1)
  })

  it('extracts GPU memory profile rows and fields from the sidecar CSV', () => {
    const filePath = path.resolve(
      process.cwd(),
      'public',
      'benchmark-cache',
      'nvidia-rtx-3080',
      'prefill',
      'raw',
      'Llama-3.2-3B-Instruct-Q8_0_p1024_b2048_ub1024_n0_r100.gpu.csv',
    )
    const profile = new MemoryProfile(filePath)

    expect(profile.csvFilePath).toBe(filePath)
    expect(profile.fields).toEqual([
      'timestamp',
      'index',
      'name',
      'memory_used_mib',
      'memory_free_mib',
      'memory_total_mib',
      'memory_utilization_percent',
      'gpu_utilization_percent',
    ])
    expect(profile.samples[0]).toMatchObject({
      timestamp: '2026/07/28 16:39:12.509',
      index: 0,
      name: 'NVIDIA GeForce RTX 3080',
      memory_used_mib: 1299,
      memory_free_mib: 8753,
      memory_total_mib: 10240,
      memory_utilization_percent: 1,
      gpu_utilization_percent: 0,
    })
  })

  it('constructs an immutable memory time series from a CSV path', () => {
    const filePath = path.resolve(process.cwd(), 'tests', 'fixtures', 'memory-timeseries.csv')
    const benchmarkFilePath = path.resolve(
      process.cwd(),
      'public',
      'benchmark-cache',
      'nvidia-rtx-3080',
      'prefill',
      'raw',
      'Llama-3.2-3B-Instruct-Q8_0_p1024_b2048_ub1024_n0_r100.json',
    )
    const series = new MemoryTimeSeries(filePath, benchmarkFilePath)

    expect(series.csvFilePath).toBe(filePath)
    expect(series.benchmarkResult).toBeInstanceOf(BenchmarkResult)
    expect(series.benchmarkResult?.jsonFilePath).toBe(benchmarkFilePath)
    expect(series.benchmarkResult?.model.modelType).toBe('llama 3B Q8_0')
    expect(series.model).toBe('Llama 3.2 3B')
    expect(series.family).toBe('Llama')
    expect(series.points).toEqual([
      { timeMs: 0, vramGB: 1.2 },
      { timeMs: 100, vramGB: 1.7 },
      { timeMs: 200, vramGB: 2.1 },
    ])
    expect(Object.isFrozen(series.points)).toBe(true)
    expect(Object.isFrozen(series.points[0])).toBe(true)
  })
})
