import { act, fireEvent, render, screen, within } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import App from '../App'
import { demoApi, type RevoraApi } from '../services/api'
import { DemoExecutionEngine } from '../services/execution/demoEngine'

const fastApi: RevoraApi = { ...demoApi, executionEngine: new DemoExecutionEngine({ lineDelayMs: 0 }) }

async function renderAt(hash: string) {
  window.location.hash = hash
  render(<App api={fastApi} />)
  await screen.findByRole('navigation', { name: 'Primary' })
}

describe('App', () => {
  it('renders the overview with demo labeling and the investigations table', async () => {
    await renderAt('#/')
    expect(screen.getByRole('heading', { name: 'Engineering Overview' })).toBeInTheDocument()
    expect(screen.getByText('Turn field failures into reproducible engineering tests.')).toBeInTheDocument()
    expect(screen.getAllByText(/Demonstration data/i).length).toBeGreaterThan(0)
    const table = screen.getByRole('table')
    expect(within(table).getByText('INC-001')).toBeInTheDocument()
    expect(within(table).getByText('Insufficient Evidence')).toBeInTheDocument()
  })

  it('navigates between primary sections', async () => {
    await renderAt('#/')
    fireEvent.click(screen.getByRole('link', { name: /Regression Library/ }))
    expect(await screen.findByRole('heading', { name: 'Regression Library' })).toBeInTheDocument()
    fireEvent.click(screen.getByRole('link', { name: /Devices/ }))
    expect(await screen.findByRole('heading', { name: 'Devices' })).toBeInTheDocument()
  })

  it('runs the reproduction end to end and reports "Target Failure Reproduced"', async () => {
    await renderAt('#/lab/INC-001')
    // Generate the scenario (step reveal uses an interval).
    const gen = screen.getAllByRole('button', { name: /Generate Test/ })[0]
    await act(async () => {
      fireEvent.click(gen)
      await new Promise((r) => setTimeout(r, 2000))
    })
    const run = screen.getByRole('button', { name: /Run Reproduction/ })
    expect(run).toBeEnabled()
    await act(async () => {
      fireEvent.click(run)
    })
    expect(await screen.findByText('Target Failure Reproduced')).toBeInTheDocument()
    expect(screen.queryByText(/^Test Failed$/)).not.toBeInTheDocument()
  }, 10000)

  it('distinguishes hypotheses from confirmed findings on the investigation page', async () => {
    await renderAt('#/investigations/INC-001')
    expect(screen.getByText('Hypotheses')).toBeInTheDocument()
    expect(screen.getByText('Confirmed Findings')).toBeInTheDocument()
    expect(screen.getByText(/Nothing confirmed yet/)).toBeInTheDocument()
  })
})
