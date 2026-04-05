import "server-only";

import {
  ZinniaApiPaths,
  zinniaCarrierPath,
} from "@/lib/zinnia/paths";
import { requestZinniaJson } from "@/lib/zinnia/request";
import type {
  CarrierDetails,
  CarrierGetResponse,
  CarrierListApiResponse,
  CarrierSummary,
  CreateCarrierDraftPayload,
  DatapointApiResponse,
  DatapointResponse,
  UpdateCarrierPayload,
} from "@/types/zinnia";
import {
  normalizeCarrierListResponse,
  normalizeDatapointResponse,
} from "@/types/zinnia";

/** POST /carriers/draft */
export async function createCarrierDraft(
  payload: CreateCarrierDraftPayload,
): Promise<CarrierDetails> {
  return requestZinniaJson<CarrierDetails>({
    method: "POST",
    path: ZinniaApiPaths.carriersDraft,
    body: payload,
  });
}

/** GET /carriers/{carrierCode} */
export async function getCarrierByCode(
  carrierCode: string,
): Promise<CarrierGetResponse> {
  return requestZinniaJson<CarrierGetResponse>({
    method: "GET",
    path: zinniaCarrierPath(carrierCode),
  });
}

/** PUT /carriers/{carrierCode} */
export async function updateCarrier(
  carrierCode: string,
  payload: UpdateCarrierPayload,
): Promise<CarrierGetResponse> {
  return requestZinniaJson<CarrierGetResponse>({
    method: "PUT",
    path: zinniaCarrierPath(carrierCode),
    body: payload,
  });
}

/** GET /carriers */
export async function getAllCarriers(): Promise<CarrierSummary[]> {
  const raw = await requestZinniaJson<CarrierListApiResponse>({
    method: "GET",
    path: ZinniaApiPaths.carriers,
  });
  return normalizeCarrierListResponse(raw);
}

/** GET /datapoints */
export async function getDatapoints(): Promise<DatapointResponse> {
  const raw = await requestZinniaJson<DatapointApiResponse>({
    method: "GET",
    path: ZinniaApiPaths.datapoints,
  });
  return normalizeDatapointResponse(raw);
}
