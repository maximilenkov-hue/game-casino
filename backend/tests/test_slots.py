from services.slot_service import evaluate_spin_result


def test_three_of_a_kind_payouts():
    # SEVEN x100
    res = evaluate_spin_result(["SEVEN", "SEVEN", "SEVEN"], 10)
    assert res["multiplier"] == 100
    assert res["payout"] == 1000

    # DIAMOND x40
    res = evaluate_spin_result(["DIAMOND", "DIAMOND", "DIAMOND"], 20)
    assert res["multiplier"] == 40
    assert res["payout"] == 800

    # CROWN x20
    res = evaluate_spin_result(["CROWN", "CROWN", "CROWN"], 10)
    assert res["multiplier"] == 20
    assert res["payout"] == 200

    # STAR x12
    res = evaluate_spin_result(["STAR", "STAR", "STAR"], 10)
    assert res["multiplier"] == 12
    assert res["payout"] == 120

    # BELL x8
    res = evaluate_spin_result(["BELL", "BELL", "BELL"], 50)
    assert res["multiplier"] == 8
    assert res["payout"] == 400

    # CHERRY x5
    res = evaluate_spin_result(["CHERRY", "CHERRY", "CHERRY"], 10)
    assert res["multiplier"] == 5
    assert res["payout"] == 50


def test_pair_payouts():
    # Ровно две BELL (x2)
    res = evaluate_spin_result(["BELL", "BELL", "STAR"], 10)
    assert res["multiplier"] == 2
    assert res["payout"] == 20

    # Ровно две STAR (x1)
    res = evaluate_spin_result(["STAR", "STAR", "CROWN"], 25)
    assert res["multiplier"] == 1
    assert res["payout"] == 25

    # Ровно две CHERRY (x1)
    res = evaluate_spin_result(["CHERRY", "CHERRY", "SEVEN"], 50)
    assert res["multiplier"] == 1
    assert res["payout"] == 50


def test_zero_payouts():
    res = evaluate_spin_result(["SEVEN", "DIAMOND", "CROWN"], 10)
    assert res["multiplier"] == 0
    assert res["payout"] == 0