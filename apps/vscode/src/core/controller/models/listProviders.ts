import { Empty } from "@/shared/proto/cline/common"
import { ProviderListingsResponse } from "@/shared/proto/cline/models"
import { type ProviderCatalogController, toProviderListingProto } from "./providerCatalogShared"

const HOOSHYAR_PROVIDER_ID = "hooshyar"

export async function listProviders(controller: ProviderCatalogController, _request: Empty): Promise<ProviderListingsResponse> {
	const providers = await controller.getProviderCatalog().listProviders()
	return ProviderListingsResponse.create({
		providers: providers.filter((provider) => provider.id === HOOSHYAR_PROVIDER_ID).map(toProviderListingProto),
	})
}
