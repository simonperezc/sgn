import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Cliente } from './entities/cliente.entity';

@Injectable()
export class ClienteService {
  constructor(
    @InjectRepository(Cliente)
    private readonly clientes: Repository<Cliente>,
  ) {}

  /**
   * Lista los clientes de un negocio (RNF-7). El negocio es obligatorio:
   * TypeORM ignora un filtro `undefined` y devolvería los clientes de todos.
   */
  async listarPorNegocio(negocioId: string): Promise<Cliente[]> {
    if (!negocioId) {
      throw new Error('Se requiere el negocio para consultar clientes');
    }
    return this.clientes.find({
      where: { negocioId },
      order: { nombre: 'ASC' },
    });
  }
}
