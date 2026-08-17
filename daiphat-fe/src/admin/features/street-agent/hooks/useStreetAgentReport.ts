"use client";

import { keepPreviousData, useMutation, useQuery } from '@tanstack/react-query';
import { QUERY_KEYS } from '../constants/queryKeys';
import {
    exportStreetAgentReport,
    getStreetAgentReportAgents,
    getStreetAgentReportOverview,
    getStreetAgentReportStations,
} from '../services/streetAgentReportService';
import {
    StreetAgentReportParams,
    StreetAgentReportTableParams,
} from '../types/street-agent.type';

export const useStreetAgentReportOverview = (params: StreetAgentReportParams) =>
    useQuery({
        queryKey: [QUERY_KEYS.STREET_AGENT_REPORT_OVERVIEW, params],
        queryFn: () => getStreetAgentReportOverview(params),
        enabled: Boolean(params.from && params.to),
        select: (response) => response.data,
    });

export const useStreetAgentReportAgents = (params: StreetAgentReportTableParams) =>
    useQuery({
        queryKey: [QUERY_KEYS.STREET_AGENT_REPORT_AGENTS, params],
        queryFn: () => getStreetAgentReportAgents(params),
        enabled: Boolean(params.from && params.to),
        select: (response) => response.data,
        placeholderData: keepPreviousData,
    });

export const useStreetAgentReportStations = (params: StreetAgentReportTableParams) =>
    useQuery({
        queryKey: [QUERY_KEYS.STREET_AGENT_REPORT_STATIONS, params],
        queryFn: () => getStreetAgentReportStations(params),
        enabled: Boolean(params.from && params.to),
        select: (response) => response.data,
        placeholderData: keepPreviousData,
    });

export const useExportStreetAgentReport = () =>
    useMutation({ mutationFn: (params: StreetAgentReportParams) => exportStreetAgentReport(params) });
