import 'package:flutter_test/flutter_test.dart';
import 'package:daiphat_mobile/src/features/auth/domain/entities/user.dart';

void main() {
  group('Admin Mobile Role and Routing Tests', () {
    test('User.isAdmin identifies admin and staff roles correctly', () {
      const admin = User(
        id: '1',
        username: 'admin',
        accessToken: 'token',
        roleCode: 'ADMIN',
      );
      expect(admin.isAdmin, isTrue);

      const roleAdmin = User(
        id: '2',
        username: 'role_admin',
        accessToken: 'token',
        roleCode: 'ROLE_ADMIN',
      );
      expect(roleAdmin.isAdmin, isTrue);

      const staffOp = User(
        id: '3',
        username: 'staff',
        accessToken: 'token',
        roleCode: 'ROLE_STAFF_OPERATOR',
      );
      expect(staffOp.isAdmin, isTrue);

      const operator = User(
        id: '4',
        username: 'op',
        accessToken: 'token',
        roleCode: 'OPERATOR',
      );
      expect(operator.isAdmin, isTrue);

      const member = User(
        id: '5',
        username: 'member',
        accessToken: 'token',
        roleCode: 'MEMBER',
      );
      expect(member.isAdmin, isFalse);

      const nullRole = User(
        id: '6',
        username: 'guest',
        accessToken: 'token',
        roleCode: null,
      );
      expect(nullRole.isAdmin, isFalse);
    });
  });
}
