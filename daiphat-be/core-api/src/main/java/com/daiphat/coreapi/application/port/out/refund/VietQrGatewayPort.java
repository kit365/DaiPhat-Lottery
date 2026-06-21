package com.daiphat.coreapi.application.port.out.refund;

import com.daiphat.coreapi.domain.model.refund.VietQrBankModel;

import java.util.List;
import java.util.Optional;

public interface VietQrGatewayPort {

    List<VietQrBankModel> getBanks();

    Optional<VietQrBankModel> findByBin(String bankBin);
}
